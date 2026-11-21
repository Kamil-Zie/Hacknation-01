#!/usr/bin/env node
// Git hooks for everyone (people and agents). Installed via core.hooksPath=.githooks (check-tools does it).
//
//   node .claude/scripts/git-checks.mjs pre-commit         secrets, team paths, claims, T-DB task, repo validation
//   node .claude/scripts/git-checks.mjs commit-msg <file>  commit format, feature freeze
//   node .claude/scripts/git-checks.mjs scan --all         secret scan of all tracked files (CI)
//
// Emergency bypass (tell the coordinator!): git commit --no-verify
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

  // Claude Design is mandatory for some members: their commits need a working Claude Design within 24h.
  const design = p.technologies?.frontend?.design || {};
  if (member && design.required && (design.required_for || []).includes(member)) {
    let at = 0;
    try { at = new Date(JSON.parse(readFileSync(resolve(projectDir, '.claude/state/design-mcp.json'), 'utf8')).last_ok?.at).getTime() || 0; } catch {}
    if (Date.now() - at > 24 * 3600 * 1000) {
      fail(`Claude Design jest wymagany (project.json → design.required) dla ${member}, a w ostatnich 24h nie zadziałał w żadnej sesji Claude na tym komputerze. ` +
        'Uruchom claude, pozwól agentowi wywołać list_types (Claude Design), potem commituj.');
    }
  }

  // Mandatory data-update task.
  const du = p.data_updates;
  if (du?.enforce) {
    const dataFiles = files.filter((f) => matchesAny(f, du.watched_paths) && !/(\.md|(^|\/)\.gitkeep)$/.test(f) && isRealDataChange(f));
    if (dataFiles.length && !files.some((f) => /^tasks\/T-DB-\d+\.json$/.test(f))) {
      fail(`Zmiana bazy (${dataFiles.join(', ')}) bez zadania update danych. Utwórz je: ${du.create}, potem git add tasks/T-DB-*.json. ` +
        'Jeśli realizujesz istniejące T-DB, dopisz notatkę w jego "notes" i dodaj plik do commita.');
    }
  }

  // One code style: Prettier and ESLint on staged code files, once the skeleton installed them.
  codeStyle(files.filter((f) => existsSync(resolve(projectDir, f))));

  // Repo consistency (tasks, contracts, messages) only when such files change.
  if (files.some((f) => /^(tasks|contracts)\/|^\.claude\/sync\//.test(f))) {
    const { errors } = validate();
    for (const e of errors) fail(`Walidacja: ${e}`);
  }
}

// Finds a locally installed binary (app's node_modules first, then the root's). Null before the skeleton.
function localBin(name, appDir) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  for (const dir of [appDir, '.'].filter(Boolean)) {
    const bin = resolve(projectDir, dir, 'node_modules/.bin', name + ext);
    if (existsSync(bin)) return bin;
  }
  return null;
}
const runBin = (bin, args, cwd) => {
  try { execFileSync(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', shell: process.platform === 'win32' }); return null; }
  catch (e) { return `${e.stdout || ''}${e.stderr || ''}`.trim(); }
};

function codeStyle(files) {
  const groups = new Map(); // app dir -> files (relative to repo)
  for (const f of files) {
    const app = (f.match(/^apps\/[^/]+/) || [null])[0];
    const key = app || '.';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  for (const [app, list] of groups) {
    const pretty = list.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|md|yml|yaml|html)$/.test(f));
    const prettier = pretty.length && localBin('prettier', app === '.' ? null : app);
    if (prettier) {
      const out = runBin(prettier, ['--check', '--ignore-unknown', ...pretty.map((f) => resolve(projectDir, f))], projectDir);
      if (out) {
        const bad = out.split('\n').filter((l) => /^\[warn\] (?!Code style issues)/.test(l)).map((l) => l.replace('[warn] ', '').replace(projectDir + '/', ''));
        fail(`Formatowanie niezgodne ze standardem (Prettier): ${bad.join(', ') || pretty.join(', ')}. Napraw: npx prettier --write ${bad.join(' ') || pretty.join(' ')} i dodaj pliki ponownie.`);
      }
    }
    const lintable = list.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
    const eslint = lintable.length && app !== '.' && localBin('eslint', app);
    if (eslint) {
      const out = runBin(eslint, ['--max-warnings=0', ...lintable.map((f) => resolve(projectDir, f))], resolve(projectDir, app));
      if (out) fail(`ESLint w ${app} (docs/coding-standard.md):\n${out.split('\n').slice(0, 25).join('\n')}`);
    }
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

// Every line ever added in any commit (run before making the repo public).
function scanHistory() {
  if (git('rev-parse --is-shallow-repository').trim() === 'true') {
    fail('Płytki klon: najpierw git fetch --unshallow (albo --depth=10000), inaczej historia nie jest pełna.');
    return;
  }
  const log = git('log --all -p -U0 --no-color --format=COMMIT:%h');
  let commit = ''; let file = '';
  for (const l of log.split('\n')) {
    if (l.startsWith('COMMIT:')) { commit = l.slice(7); continue; }
    if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
    if (l.startsWith('+') && !l.startsWith('+++')) scanText(`${file} (commit ${commit})`, l.slice(1), -1);
  }
  const ever = lines(git('log --all --format= --name-only --diff-filter=A'));
  for (const f of new Set(ever)) if (FORBIDDEN_FILES.some((re) => re.test(f))) fail(`Plik ${f} był kiedyś w historii repo.`);
  if (!problems.length) console.log(`[git-checks] ✅ Historia czysta: ${lines(git('rev-list --all')).length} commitów bez sekretów.`);
}

if (cmd === 'pre-commit') preCommit();
else if (cmd === 'commit-msg') commitMsg(arg);
else if (cmd === 'scan' && arg === '--history') scanHistory();
else if (cmd === 'scan') scanAll();
else { console.error('Usage: git-checks.mjs pre-commit | commit-msg <file> | scan --all'); process.exit(2); }

if (problems.length) {
  console.error(`\n[git-checks] ❌ ${cmd === 'scan' ? 'Znaleziono problemy (usuń sekret, zmień hasło/klucz i wyczyść historię przed upublicznieniem)' : 'Commit zablokowany'}:\n${problems.map((x) => `  - ${x}`).join('\n')}\n`);
  process.exit(1);
}
