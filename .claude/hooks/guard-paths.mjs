#!/usr/bin/env node
// Blokuje Edit/Write poza paths.write teamu osoby z HACK_MEMBER (project.json → teams).
// Kod wyjścia 2 = Claude Code odrzuca wywołanie narzędzia i pokazuje agentowi komunikat ze stderr.
import { readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const member = process.env.HACK_MEMBER;

let input = '';
try { input = readFileSync(0, 'utf8'); } catch { process.exit(0); }
let data;
try { data = JSON.parse(input); } catch { process.exit(0); }

const ti = data.tool_input || {};
const target = ti.file_path || ti.notebook_path || ti.path;
if (!target) process.exit(0);

const block = (msg) => { process.stderr.write(msg + '\n'); process.exit(2); };

if (!member) {
  block('Brak HACK_MEMBER. Skopiuj team/<twoje-imie>/settings.local.json do .claude/settings.local.json i uruchom sesję ponownie.');
}

let project;
try { project = JSON.parse(readFileSync(resolve(projectDir, 'project.json'), 'utf8')); }
catch { process.exit(0); } // bez project.json nie blokujemy

const entry = Object.entries(project.teams || {}).find(([name, t]) =>
  !name.startsWith('_') && (t.members || []).some((m) => m.id === member));
if (!entry) block(`HACK_MEMBER=${member} nie występuje w project.json → teams.`);
const [teamName, team] = entry;

const abs = isAbsolute(target) ? target : resolve(projectDir, target);
const rel = relative(projectDir, abs).split('\\').join('/');

// Pliki poza repo (np. pamięć Claude, /tmp) nie są pilnowane.
if (rel.startsWith('..')) process.exit(0);
// Osobiste ustawienia lokalne zawsze wolno edytować.
if (rel === '.claude/settings.local.json') process.exit(0);

// Claude Design is mandatory for some members (project.json → technologies.frontend.design.required_for):
// no file in the repo may be edited until an artifacts MCP tool has succeeded in THIS session.
const design = project.technologies?.frontend?.design || {};
if (design.required && (design.required_for || []).includes(member)) {
  let ok = false;
  try {
    const st = JSON.parse(readFileSync(resolve(projectDir, '.claude/state/design-mcp.json'), 'utf8'));
    ok = !!st.sessions?.[data.session_id];
  } catch {}
  if (!ok) {
    block(`Claude Design jest obowiązkowy dla ${member}: nie zaczynasz pracy, dopóki narzędzia Claude Design nie działają w tej sesji. ` +
      `Załaduj je przez ToolSearch („artifacts design”) i wywołaj list_types (albo list_artifacts z typem „Design System”). ` +
      `Udane wywołanie odblokuje edycję. Brak narzędzi: osoba loguje Claude Code kontem claude.ai (/login), sprawdza /mcp i uruchamia sesję ponownie.`);
  }
}

const globToRegex = (g) => new RegExp('^' + g
  .replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .replace(/\*\*\/?/g, '\u0000')
  .replace(/\*/g, '[^/]*')
  .replace(/\?/g, '[^/]')
  .replace(/\u0000/g, '.*') + '$');

const allowed = (team.paths?.write || []).some((g) => globToRegex(g).test(rel));
if (!allowed) {
  block(`Plik ${rel} nie należy do teamu "${teamName}" (${member}). ` +
    `Nie edytuj go i nie obchodź blokady. Wyślij wiadomość do właściciela w .claude/sync/messages/ ` +
    `(question, contract_proposal albo decision_request do koordynatora).`);
}

// Rezerwacje: wolno edytować tylko własny plik claim.
const claim = rel.match(/^\.claude\/sync\/claims\/(.+)\.md$/);
if (claim && claim[1] !== member && teamName !== 'coordinator') {
  block(`To rezerwacje ${claim[1]}. Edytuj tylko .claude/sync/claims/${member}.md.`);
}
process.exit(0);
