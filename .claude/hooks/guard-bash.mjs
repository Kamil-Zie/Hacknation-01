#!/usr/bin/env node
// PreToolUse(Bash): the same rules as guard-paths.mjs for files written from the terminal
// (redirections, tee, sed -i, cp/mv/rm/touch/truncate, inline node/python scripts that write files).
// Blocks writes outside the team's paths.write, into someone else's claims, and every repo write
// of members who must use Claude Design until it worked in this session.
// Exit code 2 = Claude Code rejects the call and shows stderr to the agent.
import { readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { project, teamOf, matchesAny, projectDir } from '../scripts/lib.mjs';

let data;
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const cmd = data.tool_input?.command || '';
if (!cmd) process.exit(0);

const block = (msg) => { process.stderr.write(msg + '\n'); process.exit(2); };
const member = process.env.HACK_MEMBER;
let p;
try { p = project(); } catch { process.exit(0); }
const team = teamOf(member, p);
const cwd = data.cwd || projectDir;

// --- split into simple commands and words (quotes respected, good enough for agent commands) ---
function words(s) {
  const out = []; let cur = ''; let q = null; let has = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; else if (c === '\\' && q === '"' && i + 1 < s.length) cur += s[++i]; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; has = true; continue; }
    if (c === '\\' && i + 1 < s.length) { cur += s[++i]; has = true; continue; }
    if (/\s/.test(c)) { if (cur || has) out.push(cur); cur = ''; has = false; continue; }
    // split redirections into their own words: a>b, 2>&1, >>x
    if (c === '>' ) {
      if (cur && !/^\d+$/.test(cur)) { out.push(cur); cur = ''; }
      let op = (cur || '') + '>'; cur = '';
      if (s[i + 1] === '>') { op += '>'; i++; }
      if (s[i + 1] === '&') { op += '&'; i++; }
      out.push(op); has = false; continue;
    }
    cur += c; has = true;
  }
  if (cur || has) out.push(cur);
  return out;
}
const segments = cmd.split(/&&|\|\||;|\n|\|(?!\|)/).map((s) => words(s.trim())).filter((w) => w.length);

const targets = new Set(); // absolute paths
let inlineWrite = false;
let dir = cwd; // follows `cd` between segments
const add = (t) => { if (t && !t.startsWith('&') && !/^\/dev\//.test(t)) targets.add(resolve(dir, t.replace(/^~(?=\/)/, process.env.HOME || '~'))); };
const nonFlags = (ws) => ws.filter((w) => !w.startsWith('-'));

for (let ws of segments) {
  // redirections anywhere in the segment
  for (let i = 0; i < ws.length; i++) {
    if (/^\d*>>?$/.test(ws[i]) && ws[i + 1]) add(ws[i + 1]);
    if (/^&>>?$/.test(ws[i]) && ws[i + 1]) add(ws[i + 1]);
  }
  ws = ws.filter((w, i) => !/^(\d*>>?&?|&>>?)$/.test(w) && !/^(\d*>>?&?|&>>?)$/.test(ws[i - 1] || ''));
  // input redirections (< file, <<EOF, <<<str) are not writes
  ws = ws.filter((w, i) => !w.startsWith('<') && !/^<{1,3}$/.test(ws[i - 1] || ''));
  if (ws[0] === 'cd') { dir = ws[1] ? resolve(dir, ws[1].replace(/^~(?=\/)/, process.env.HOME || '~')) : (process.env.HOME || dir); continue; }
  while (ws.length && /^(sudo|env|command|nohup|time|xargs)$|^\w+=/.test(ws[0])) ws = ws.slice(1);
  const [prog, ...args] = ws;
  if (!prog) continue;
  const base = prog.split('/').pop();
  if (base === 'tee') nonFlags(args).forEach(add);
  else if (base === 'sed' && args.some((a) => /^-i|^--in-place/.test(a) || /^-[a-zA-Z]*i/.test(a))) {
    const rest = nonFlags(args); const hasE = args.some((a) => a === '-e' || a === '--expression');
    (hasE ? rest.slice(0) : rest.slice(1)).forEach(add);
  } else if (base === 'perl' && args.some((a) => /^-[a-zA-Z]*i/.test(a))) nonFlags(args).slice(1).forEach(add);
  else if (['cp', 'install', 'ln', 'rsync'].includes(base)) { const r = nonFlags(args); if (r.length) add(r[r.length - 1]); }
  else if (base === 'mv') nonFlags(args).forEach(add);
  else if (['rm', 'rmdir', 'unlink', 'touch', 'truncate', 'shred'].includes(base)) nonFlags(args).forEach(add);
  else if (['node', 'python', 'python3', 'deno', 'bun', 'ruby'].includes(base) && args.some((a) => ['-e', '--eval', '-c', '-p'].includes(a))) {
    const code = args.join(' ');
    if (/writeFile|appendFile|rmSync|rm\(|unlink|rename|copyFile|createWriteStream|mkdirSync|truncate|open\([^)]*,\s*['"](w|a|x)|\.write_text|\.write_bytes|shutil\.|os\.remove/.test(code)) inlineWrite = true;
  } else if (base === 'git' && ['checkout', 'restore'].includes(args[0])) {
    const i = args.indexOf('--'); if (i >= 0) args.slice(i + 1).forEach(add);
  }
}

// --- repo-relative paths ---
const rels = [...targets]
  .map((t) => relative(projectDir, t).split('\\').join('/'))
  .filter((r) => r && !r.startsWith('..') && !isAbsolute(r));

if (!rels.length && !inlineWrite) process.exit(0);
if (!member) block('Brak HACK_MEMBER. Skopiuj team/<twoje-imie>/settings.local.json do .claude/settings.local.json i uruchom sesję ponownie.');
if (!team) block(`HACK_MEMBER=${member} nie występuje w project.json → teams.`);

// Claude Design first for members who must use it.
const design = p.technologies?.frontend?.design || {};
if (design.required && (design.required_for || []).includes(member) && (rels.length || inlineWrite)) {
  let ok = false;
  try { ok = !!JSON.parse(readFileSync(resolve(projectDir, '.claude/state/design-mcp.json'), 'utf8')).sessions?.[data.session_id]; } catch {}
  if (!ok) block(`Claude Design jest obowiązkowy dla ${member}: zanim cokolwiek zapiszesz (także z terminala), wywołaj narzędzie Claude Design (ToolSearch „artifacts design”, potem list_types).`);
}

if (team === 'coordinator') process.exit(0);

if (inlineWrite) {
  block('Zapis plików przez node -e / python -c jest zablokowany, bo omija kontrolę ścieżek teamu. Użyj narzędzi Edit/Write albo skryptu z .claude/scripts/.');
}

const allowed = p.teams[team].paths?.write || [];
const writable = (r) => r === '.claude/settings.local.json' || r.startsWith('.claude/state/') || r.startsWith('node_modules/') || /(^|\/)node_modules\//.test(r) || matchesAny(r, allowed) || allowed.some((g) => g.endsWith('/**') && r === g.slice(0, -3));
const foreign = rels.filter((r) => !writable(r));
if (foreign.length) {
  block(`Komenda zapisuje pliki spoza teamu "${team}" (${member}): ${foreign.join(', ')}. ` +
    'Nie obchodź blokady przez terminal. Wyślij wiadomość do właściciela (new-message.mjs).');
}
const claimsDir = p.coordination?.claims_dir || '.claude/sync/claims';
const otherClaim = rels.find((r) => r.startsWith(`${claimsDir}/`) && r !== `${claimsDir}/${member}.md`);
if (otherClaim) block(`${otherClaim} to cudze rezerwacje. Edytuj tylko ${claimsDir}/${member}.md.`);
process.exit(0);
