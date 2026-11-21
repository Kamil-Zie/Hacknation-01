#!/usr/bin/env node
// Short, team-specific view of project.json (~1–2k tokens instead of ~15k for the whole file).
// Agents read this instead of project.json; open project.json only for a specific key.
//
// Usage: node .claude/scripts/brief.mjs [--team frontend|backend|coordinator]   (default: team of HACK_MEMBER)
import { project, loadLocalEnv, teamOf, now } from './lib.mjs';

loadLocalEnv();
const p = project();
const args = process.argv.slice(2);
const team = args[args.indexOf('--team') + 1] && args.includes('--team') ? args[args.indexOf('--team') + 1] : teamOf(process.env.HACK_MEMBER, p) || 'coordinator';
const out = [];
const add = (s = '') => out.push(s);
const filled = (v) => v && !(typeof v === 'string' && /UZUPEŁNIJ|^<.*>$/.test(v)) && !(Array.isArray(v) && (!v.length || v.every((x) => !filled(x))));
const str = (v) => (typeof v === 'string' ? v : JSON.stringify(v));

// Concept
const c = p.project.concept || {};
add(`# Brief: ${p.project.name} · team ${team}`);
if (filled(c.problem)) {
  add(`Problem: ${str(c.problem)}`);
  if (filled(c.solution)) add(`Rozwiązanie: ${str(c.solution)}`);
  if (filled(c.target_users)) add(`Użytkownicy: ${str(c.target_users)}`);
  if (filled(c.demo_scenario)) {
    add('Scenariusz demo (pracujemy tylko nad tym):');
    [].concat(c.demo_scenario).forEach((s, i) => add(`  ${i + 1}. ${str(s)}`));
  }
  if (filled(c.mvp_scope)) add(`MVP: ${str(c.mvp_scope)}`);
} else add('Koncepcja: jeszcze nieuzupełniona (faza Koncepcja). Nie zaczynaj kodu przed scenariuszem demo.');

// Stack
const t = p.technologies;
if (t.status === 'decided') {
  add('Stack (używaj tylko tego):');
  for (const k of ['frontend', 'backend', 'database']) {
    const ch = Object.entries(t[k]?.choice || {}).filter(([, v]) => v).map(([a, v]) => `${a}=${v}`).join(', ');
    if (ch) add(`  ${k}: ${ch}`);
  }
} else add(`Stack: niezdecydowany (domyślny: ${Object.entries(t.recommended_default).filter(([k, v]) => typeof v === 'string' && k !== 'why').map(([k, v]) => `${k}: ${v}`).join('; ')})`);

// Phase
const clock = p.modes?.hackathon?.clock;
if (clock) {
  const n = now();
  const ph = clock.phases.find((x) => n < new Date(x.until));
  const ms = clock.milestones.find((m) => new Date(m.at) > n);
  if (n < new Date(clock.started_at)) add(`Czas: przed startem (${clock.started_at}).`);
  else if (ph) add(`Faza: ${ph.name} do ${ph.until.slice(11, 16)}. Cel: ${ph.goal}`);
  if (ms) add(`Następny kamień: ${ms.name} ${ms.at.slice(5, 16).replace('T', ' ')}: ${ms.goal}`);
}

// Team
const tm = p.teams[team];
if (tm) {
  add(`Team ${team}: ${tm.members.map((m) => `${m.id} ${m.name} (${m.focus})`).join(', ')}. Lead: ${tm.lead_agent}.`);
  add(`Możesz zapisywać: ${tm.paths.write.join(', ')}`);
}

// Rules (hackathon)
add('Zasady:');
(p.modes?.hackathon?.rules || []).forEach((r) => add(`  - ${r}`));

// Team-specific essentials
const dev = p.technologies.infrastructure?.environment_config?.dev;
if (dev) add(`Dev: aplikacje lokalnie (${Object.entries(dev.urls || {}).map(([k, v]) => `${k} ${v}`).join(', ')}), baza: ${dev.database}`);
if (team === 'frontend' || team === 'coordinator') {
  const d = p.technologies.frontend?.design;
  if (d) add(`UI: ${(d.policy || d.tool).replace(/\.$/, '')}. Responsywnie 360/768/1280/1920 px. Wzór z innej aplikacji: agent fe-reference.`);
}
if (team === 'backend' || team === 'coordinator') {
  add(`Baza: zmiana modelu/seeda = zadanie T-DB w tym samym commicie (${p.data_updates?.create}). Seed na wspólnej bazie dev tylko wykonawca T-DB.`);
}
if (team === 'coordinator') add('Prod: Synology + Cloudflare Tunnel, porty i compose: docs/deploy.md.');

add('Kod: docs/coding-standard.md (czytaj tylko sekcję swojego teamu). Mapa kodu: node .claude/scripts/project-map.mjs.');
add('Wiadomości: inbox.mjs / new-message.mjs. Pełne dane: project.json, czytaj tylko konkretne klucze (np. grep), nie cały plik.');
console.log(out.join('\n'));
