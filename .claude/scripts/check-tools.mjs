#!/usr/bin/env node
// Checks that the current team member has the tools required by their team's stack.
// Requirements: project.json → tooling (+ technologies.*.choice, or recommended_default before the decision).
//
// Usage:
//   node .claude/scripts/check-tools.mjs            exit 1 when something required is missing
//   node .claude/scripts/check-tools.mjs --hook     always exit 0 (SessionStart hook; output goes to the agent)
//   HACK_MEMBER=backend-1 node .claude/scripts/check-tools.mjs   check as someone else
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { promises as dns } from 'node:dns';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const hookMode = process.argv.includes('--hook');

const project = JSON.parse(readFileSync(resolve(projectDir, 'project.json'), 'utf8'));
const cfg = project.tooling;
const tech = project.technologies || {};
const platform = process.platform;

const out = [];
let errors = 0;
let warnings = 0;
const ok = (m) => out.push(`✅ ${m}`);
const fail = (m) => { errors++; out.push(`❌ ${m}`); };
const warn = (m) => { warnings++; out.push(`⚠️  ${m}`); };

// Outside a Claude session the env from .claude/settings.local.json is not loaded, so read it here.
try {
  const local = JSON.parse(readFileSync(resolve(projectDir, '.claude/settings.local.json'), 'utf8'));
  for (const [k, v] of Object.entries(local.env || {})) if (!process.env[k] && v) process.env[k] = v;
} catch {}

// --- who am I ---------------------------------------------------------------------------------
const member = process.env.HACK_MEMBER;
const teams = Object.entries(project.teams || {}).filter(([k]) => !k.startsWith('_'));
const entry = teams.find(([, t]) => (t.members || []).some((m) => m.id === member));
let teamName = entry?.[0];
if (!member) fail('HACK_MEMBER nie jest ustawiony. Skopiuj team/<imię>/settings.local.json do .claude/settings.local.json i uruchom sesję ponownie.');
else if (!entry) fail(`HACK_MEMBER=${member} nie występuje w project.json → teams.`);
else ok(`Sesja: ${member} (team ${teamName})`);
const teamCfg = cfg.teams[teamName] || cfg.teams.coordinator; // unknown member: check everything

// --- required tools from the stack ----------------------------------------------------------
const decided = tech.status === 'decided';
const stackText = teamCfg.stack_scope.map((scope) => {
  const choice = Object.values(tech[scope]?.choice || {}).filter(Boolean).join(' ');
  return choice || (decided ? '' : tech.recommended_default?.[scope] || '');
}).concat(decided ? [] : [tech.recommended_default?.package_manager || '']).join(' ').toLowerCase();

const required = new Set(cfg.common);
for (const rule of cfg.stack_rules) {
  if (rule.match.some((k) => stackText.includes(k.toLowerCase()))) rule.tools.forEach((t) => required.add(t));
}
const optional = new Set((teamCfg.optional_tools || []).filter((t) => !required.has(t)));
if (!decided) out.push(`ℹ️  Stack jeszcze nie wybrany: sprawdzam wymagania dla recommended_default.`);

const parse = (s) => (s.match(/(\d+)\.(\d+)(?:\.(\d+))?/) || []).slice(1).map((n) => Number(n || 0));
const gte = (a, b) => { for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0); } return true; };
const hint = (tool) => { const i = cfg.tools[tool]?.install || {}; return i[platform] || i.any || Object.values(i)[0] || ''; };

const checkTool = (tool, isRequired) => {
  const t = cfg.tools[tool];
  if (!t) return;
  let raw = '';
  try { raw = execSync(t.cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim(); } catch {}
  const report = isRequired ? fail : warn;
  if (!raw) return report(`${tool}: nie znaleziono${isRequired ? '' : ' (opcjonalne)'}. Instalacja: ${hint(tool)}`);
  const v = parse(raw);
  if (t.min && !gte(v, parse(t.min))) return report(`${tool} ${v.join('.')}: za stara wersja, wymagane >= ${t.min}. Aktualizacja: ${hint(tool)}`);
  ok(`${tool} ${v.join('.')}${t.min ? ` (>= ${t.min})` : ''}`);
};
[...required].forEach((t) => checkTool(t, true));
[...optional].forEach((t) => checkTool(t, false));

// --- .env -----------------------------------------------------------------------------------
const envPath = resolve(projectDir, cfg.env_file);
const env = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const hasPlaceholder = (v) => cfg.placeholder_markers.some((p) => v.includes(p));
if (!existsSync(envPath) && (teamCfg.env_required.length || teamCfg.env_recommended.length)) {
  (teamCfg.env_required.length ? fail : warn)(`Brak pliku ${cfg.env_file}. Zrób: cp .env.example ${cfg.env_file} i uzupełnij wartości.`);
} else {
  for (const k of teamCfg.env_required) {
    if (!env[k]) fail(`${cfg.env_file}: brak ${k}.`);
    else if (hasPlaceholder(env[k])) fail(`${cfg.env_file}: ${k} ma jeszcze wartości przykładowe (<...>). Wklej prawdziwą wartość od Kamila.`);
    else ok(`${cfg.env_file}: ${k} ustawione`);
  }
  for (const k of teamCfg.env_recommended) if (!env[k]) warn(`${cfg.env_file}: brak ${k} (jest w .env.example).`);
}

// --- Atlas reachability (DNS only, no credentials used) ----------------------------------------
const uri = env.MONGODB_URI;
if (cfg.atlas_dns_check && uri && !hasPlaceholder(uri)) {
  const host = (uri.match(/^mongodb\+srv:\/\/(?:[^@]+@)?([^/?]+)/) || [])[1];
  if (host) {
    try {
      await Promise.race([dns.resolveSrv(`_mongodb._tcp.${host}`), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 4000))]);
      ok(`MongoDB Atlas: klaster ${host} znaleziony`);
    } catch {
      warn(`MongoDB Atlas: nie udało się znaleźć ${host} (zły adres klastra albo brak internetu).`);
    }
  }
}

// --- Discord (optional) -------------------------------------------------------------------------
const hooks = project.communication?.discord?.webhook_env || {};
const wanted = [hooks.sync, teamName && hooks[teamName]].filter(Boolean);
const missingHooks = wanted.filter((h) => !process.env[h]);
if (missingHooks.length) warn(`Discord: brak ${missingHooks.join(', ')} w .claude/settings.local.json (powiadomienia będą pomijane).`);

// --- summary ---------------------------------------------------------------------------------
const head = errors
  ? `[check-tools] ❌ Brakuje ${errors} wymaganych rzeczy${warnings ? `, ${warnings} ostrzeżeń` : ''}. Najpierw to napraw.`
  : `[check-tools] ✅ Środowisko gotowe${warnings ? ` (${warnings} ostrzeżeń)` : ''}.`;
console.log([head, ...out].join('\n'));
if (hookMode && errors) {
  console.log('\nAgent: zanim weźmiesz zadanie, pokaż osobie powyższe braki (❌) z komendami instalacji i poproś o instalację. Nie instaluj narzędzi systemowych sam.');
}
process.exit(hookMode ? 0 : errors ? 1 : 0);
