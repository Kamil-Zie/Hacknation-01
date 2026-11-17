#!/usr/bin/env node
// Git hooks for everyone (people and agents). Installed via core.hooksPath=.githooks (check-tools does it).
//
//   node .claude/scripts/git-checks.mjs pre-commit         secrets, team paths, claims, T-DB task, repo validation
//   node .claude/scripts/git-checks.mjs commit-msg <file>  commit format, feature freeze
//   node .claude/scripts/git-checks.mjs scan --all         secret scan of all tracked files (CI)
//
// Emergency bypass (tell the coordinator!): git commit --no-verify
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { project, loadLocalEnv, teamOf, matchesAny, git, lines, projectDir, now, freezeAt } from './lib.mjs';
import { validate } from './validate.mjs';

loadLocalEnv();
const p = project();
const [cmd, arg] = process.argv.slice(2);
const problems = [];
const fail = (m) => problems.push(m);

const SECRET_PATTERNS = [
  [/mongodb(\+srv)?:\/\/[^\s:/<>"'`]+:[^\s@<>"'`]+@/i, 'MongoDB URI z hasłem'],
  [/discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]{20,}/i, 'adres webhooka Discord'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'klucz prywatny'],
  [/\bsk-ant-[\w-]{20,}/, 'klucz API Anthropic'],
  [/\bsk-[A-Za-z0-9]{32,}/, 'klucz API (sk-...)'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}/, 'token GitHub'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'klucz AWS'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'klucz Google API'],
];
const FORBIDDEN_FILES = [/^\.env$/, /^\.env\.(?!example$)/, /(^|\/)\.env$/, /^\.claude\/settings\.local\.json$/];

const scanText = (file, text, lineOffset = 0) => {
  text.split('\n').forEach((line, i) => {
    for (const [re, what] of SECRET_PATTERNS) {
      if (re.test(line)) fail(`Sekret (${what}) w ${file}${lineOffset >= 0 ? `:${i + 1 + lineOffset}` : ''}. Przenieś go do .env albo .claude/settings.local.json.`);
    }
  });
};

const stagedFiles = () => lines(git('diff --cached --name-only --diff-filter=ACMRD'));

function scanStaged() {
  const diff = git('diff --cached -U0 --no-color --diff-filter=ACMR');
  let file = null; let lineNo = 0;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (h) { lineNo = Number(h[1]); continue; }
    if (l.startsWith('+') && file) { scanText(file, l.slice(1), lineNo - 1); lineNo++; }
  }
}

// Strip keys starting with "_" so doc-only edits (_example, _note) are not data changes.
const stripDocs = (v) => Array.isArray(v) ? v.map(stripDocs)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, x]) => [k, stripDocs(x)])) : v;
const isRealDataChange = (f) => {
  if (!f.endsWith('.json')) return true;
  try {
    const before = git(`show HEAD:${f}`); const after = git(`show :${f}`);
    if (!before || !after) return true;
    return JSON.stringify(stripDocs(JSON.parse(before))) !== JSON.stringify(stripDocs(JSON.parse(after)));
  } catch { return true; }
};

function preCommit() {
  const files = stagedFiles();
  if (!files.length) return;

  for (const f of files) if (FORBIDDEN_FILES.some((re) => re.test(f))) fail(`Plik ${f} zawiera sekrety i nie może trafić do repo (git rm --cached ${f}).`);
  scanStaged();

  // Team write paths and claims (same rules as .claude/hooks/guard-paths.mjs, but for every commit).
  const member = process.env.HACK_MEMBER;
  const team = teamOf(member, p);
  if (!member || !team) {
    fail(`Nieznana osoba (HACK_MEMBER=${member || 'brak'}). Skopiuj team/<imię>/settings.local.json do .claude/settings.local.json.`);
  } else {
    const allowed = p.teams[team].paths?.write || [];
    const foreign = files.filter((f) => !matchesAny(f, allowed));
    if (foreign.length) fail(`Team ${team} (${member}) nie może zmieniać: ${foreign.join(', ')}. Wyślij wiadomość do właściciela.`);
    if (team !== 'coordinator') {
      const claimsDir = p.coordination?.claims_dir || '.claude/sync/claims';
      for (const f of files) {
        const m = f.match(new RegExp(`^${claimsDir.replace(/[.]/g, '\\.')}/(.+)\\.md$`));
        if (m && m[1] !== member) fail(`${f} to rezerwacje ${m[1]}. Zmieniaj tylko ${claimsDir}/${member}.md.`);
      }
    }
  }

  // Mandatory data-update task.
  const du = p.data_updates;
  if (du?.enforce) {
    const dataFiles = files.filter((f) => matchesAny(f, du.watched_paths) && isRealDataChange(f));
    if (dataFiles.length && !files.some((f) => /^tasks\/T-DB-\d+\.json$/.test(f))) {
      fail(`Zmiana bazy (${dataFiles.join(', ')}) bez zadania update danych. Utwórz je: ${du.create}, potem git add tasks/T-DB-*.json. ` +
        'Jeśli realizujesz istniejące T-DB, dopisz notatkę w jego "notes" i dodaj plik do commita.');
    }
  }

  // Repo consistency (tasks, contracts, messages) only when such files change.
  if (files.some((f) => /^(tasks|contracts)\/|^\.claude\/sync\//.test(f))) {
    const { errors } = validate();
    for (const e of errors) fail(`Walidacja: ${e}`);
  }
}

function commitMsg(file) {
  const msg = readFileSync(resolve(projectDir, file), 'utf8').split('\n').filter((l) => !l.startsWith('#'))[0]?.trim() || '';
  if (/^(Merge |Revert "|fixup! |squash! |amend! )/.test(msg)) return;
  const m = msg.match(/^(feat|fix|docs|chore|refactor|test|style|perf|build|ci|revert)(?:\(([\w.-]+)\))?!?: \S/);
  if (!m) {
    fail(`Zły format commita: "${msg}". Wymagany: <typ>(<zakres>): <opis> [<id-zadania>], np. feat(api): GET /items [T-002]. Typy: feat, fix, docs, chore, refactor, test, style, perf, build, ci, revert.`);
    return;
  }
  const [, type, scope] = m;
  if (['feat', 'fix', 'refactor', 'test', 'perf'].includes(type) && scope !== 'coord' && !/\[T-[A-Z0-9-]*\d+\]/.test(msg)) {
    fail(`Commit typu ${type} musi mieć ID zadania na końcu, np. [T-004] albo [T-DB-001].`);
  }

  const freeze = freezeAt(p);
  if (freeze && now() >= freeze) {
    const member = process.env.HACK_MEMBER;
    if (teamOf(member, p) === 'coordinator') return; // coordinator decides during the freeze
    const files = stagedFiles();
    const housekeeping = files.every((f) => /^(tasks\/|\.claude\/sync\/|docs\/|team\/|README\.md$)/.test(f));
    const ok = ['fix', 'docs', 'revert'].includes(type) || (type === 'chore' && housekeeping);
    if (!ok) fail(`Zamrożenie funkcji od ${freeze.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}: dozwolone tylko fix, docs, revert (i chore dla zadań/wiadomości/dokumentacji). Nowe funkcje tylko za zgodą koordynatora.`);
  }
}

function scanAll() {
  for (const f of lines(git('ls-files'))) {
    if (FORBIDDEN_FILES.some((re) => re.test(f))) fail(`Plik ${f} nie powinien być w repo.`);
    let text = '';
    try { text = readFileSync(resolve(projectDir, f), 'utf8'); } catch { continue; }
    if (text.includes('\u0000')) continue; // binary
    scanText(f, text);
  }
}

if (cmd === 'pre-commit') preCommit();
else if (cmd === 'commit-msg') commitMsg(arg);
else if (cmd === 'scan') scanAll();
else { console.error('Usage: git-checks.mjs pre-commit | commit-msg <file> | scan --all'); process.exit(2); }

if (problems.length) {
  console.error(`\n[git-checks] ❌ Commit zablokowany:\n${problems.map((x) => `  - ${x}`).join('\n')}\n`);
  process.exit(1);
}
