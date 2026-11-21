#!/usr/bin/env node
// Compact map of the code and contracts, generated from the repository itself, so agents
// do not explore the tree file by file. Never committed (no merge conflicts): written to
// .claude/state/PROJECT_MAP.md and printed. Each file's description comes from its first
// comment line (docs/coding-standard.md requires e.g. "// API-002 GET /items").
//
// Usage: node .claude/scripts/project-map.mjs [--team frontend|backend] [--quiet]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { project, readJson, readTasks, openMessages, git, lines, projectDir, loadLocalEnv, teamOf } from './lib.mjs';

loadLocalEnv();
const p = project();
const args = process.argv.slice(2);
const team = args.includes('--team') ? args[args.indexOf('--team') + 1] : teamOf(process.env.HACK_MEMBER, p);
const MAX_FILES = 140;
const out = [];
const add = (s = '') => out.push(s);

const roots = team === 'frontend' ? ['apps/frontend'] : team === 'backend' ? ['apps/backend', 'database'] : ['apps', 'database'];
const files = lines(git('ls-files')).concat(lines(git('ls-files --others --exclude-standard')))
  .filter((f) => roots.some((r) => f.startsWith(r + '/')))
  .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html)$/.test(f) && !/(^|\/)(node_modules|dist|build|coverage)\//.test(f) && !/package-lock\.json$/.test(f));

const describe = (f) => {
  try {
    const first = readFileSync(resolve(projectDir, f), 'utf8').split('\n').slice(0, 5).find((l) => /^\s*(\/\/|\/\*|\*|#|<!--)/.test(l) && l.replace(/[/*#<!\->\s]/g, ''));
    return first ? first.replace(/^\s*(\/\/|\/\*+|\*|#|<!--)\s*/, '').replace(/\s*(\*\/|-->)\s*$/, '').slice(0, 90) : '';
  } catch { return ''; }
};

add(`# Mapa projektu${team ? ` (team ${team})` : ''}`);
add(`Wygenerowano: ${new Date().toISOString().slice(0, 16)}Z z ${git('rev-parse --short HEAD').trim() || '?'}. Odśwież po git pull: node .claude/scripts/project-map.mjs`);
add();

// --- code tree grouped by directory ---
add(`## Kod (${files.length} plików${files.length > MAX_FILES ? `, pokazane ${MAX_FILES}` : ''})`);
if (!files.length) add('Brak kodu (przed szkieletem).');
const byDir = new Map();
for (const f of files.slice(0, MAX_FILES)) {
  const d = f.split('/').slice(0, -1).join('/');
  if (!byDir.has(d)) byDir.set(d, []);
  byDir.get(d).push(f.split('/').pop());
}
for (const [d, fs] of byDir) {
  add(`${d}/`);
  for (const name of fs) { const desc = describe(`${d}/${name}`); add(`  ${name}${desc ? ` — ${desc}` : ''}`); }
}
add();

// --- contracts ---
const safe = (fn) => { try { return fn(); } catch { return null; } };
const api = safe(() => readJson('contracts/api.json'));
const dm = safe(() => readJson('contracts/data_model.json'));
const ui = safe(() => readJson('contracts/ui.json'));
add('## Kontrakty');
if (api?.endpoints?.length && team !== undefined) {
  add(`API (${api.base_url || ''}, v${api.version}):`);
  for (const e of api.endpoints) add(`  ${e.id} ${e.method} ${e.path} [${e.status}] ${e.summary || ''}`);
}
if (dm?.entities?.length && team !== 'frontend') {
  add(`Model danych v${dm.version}:`);
  for (const e of dm.entities) add(`  ${e.id} ${e.name} [${e.status}]: ${(e.fields || []).map((f) => f.name).join(', ')}`);
}
if (ui && team !== 'backend') {
  if (ui.screens?.length) { add('Ekrany:'); for (const s of ui.screens) add(`  ${s.id} ${s.name || ''} ${s.route || ''} [${s.status}]${s.reference ? ' (wzór)' : ''}${s.design_artboards ? ' (artboardy)' : ''}`); }
  if (ui.components?.length) { add('Komponenty:'); for (const c of ui.components) add(`  ${c.id} ${c.name || ''} [${c.status}]${c.reference ? ' (wzorzec)' : ''}`); }
  if (ui.design_canvas_url) add(`Canvas Claude Design: ${ui.design_canvas_url}`);
}
if (!api?.endpoints?.length && !dm?.entities?.length && !ui?.screens?.length) add('Puste (kontrakty powstają w fazie Koncepcja).');
add();

// --- tasks and messages ---
const tasks = readTasks().filter((t) => !t._parseError && t.status !== 'done' && (!team || t.team === team || team === 'coordinator'));
add(`## Otwarte zadania${team && team !== 'coordinator' ? ` teamu ${team}` : ''} (${tasks.length})`);
for (const t of tasks.slice(0, 30)) add(`  ${t.id} [${t.status}] ${t.assignee || '-'}: ${t.title}${t.contract_refs?.length ? ` (${t.contract_refs.join(', ')})` : ''}`);
const msgs = openMessages(p).filter((m) => !team || team === 'coordinator' || m.fm.to === team || m.fm.to === 'all');
if (msgs.length) { add(`## Wiadomości bez ack (${msgs.length})`); for (const m of msgs) add(`  ${m.fm.type} ${m.fm.from} → ${m.fm.to}: ${m.name}`); }

const text = out.join('\n') + '\n';
mkdirSync(resolve(projectDir, '.claude/state'), { recursive: true });
writeFileSync(resolve(projectDir, '.claude/state/PROJECT_MAP.md'), text);
if (!args.includes('--quiet')) process.stdout.write(text);
