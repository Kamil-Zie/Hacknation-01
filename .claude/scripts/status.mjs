#!/usr/bin/env node
// One-screen status for the coordinator (and anyone): phase, next milestone, tasks per person,
// blocked tasks, open data-update tasks, stale claims, open messages, repo validation.
// Usage: node .claude/scripts/status.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { project, readTasks, openMessages, members, teamOf, git, now, projectDir } from './lib.mjs';
import { validate } from './validate.mjs';

const p = project();
const clock = p.modes?.hackathon?.clock || {};
const t = now();
const fmtDur = (ms) => { const m = Math.round(Math.abs(ms) / 60000); const h = Math.floor(m / 60); return h ? `${h}h ${m % 60}min` : `${m}min`; };
const hhmm = (d) => d.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'short', hour: '2-digit', minute: '2-digit' });
const out = [];

// --- time ---
const start = clock.started_at ? new Date(clock.started_at) : null;
if (start && t < start) out.push(`⏳ Start za ${fmtDur(start - t)} (${hhmm(start)})`);
else if (start) {
  const phase = (clock.phases || []).find((ph) => t < new Date(ph.until));
  const h = ((t - start) / 3600000).toFixed(1);
  out.push(phase ? `🕐 Godzina ${h} · faza „${phase.name}” do ${hhmm(new Date(phase.until))} (${fmtDur(new Date(phase.until) - t)})\n   Cel: ${phase.goal}` : `🏁 Hackathon zakończony (${h}h od startu)`);
}
const next = (clock.milestones || []).map((m) => ({ ...m, d: new Date(m.at) })).find((m) => m.d > t);
if (next) out.push(`🎯 Następny kamień: ${next.name} — ${hhmm(next.d)} (za ${fmtDur(next.d - t)})`);

// --- tasks ---
const tasks = readTasks().filter((x) => !x._parseError);
const active = tasks.filter((x) => x.status !== 'done');
const done = tasks.length - active.length;
out.push(`\n📋 Zadania: ${tasks.length} (zrobione ${done}, otwarte ${active.length})`);
const icon = { in_progress: '🔨', in_review: '👀', integration: '🔗', ready: '🟢', backlog: '⚪', blocked: '⛔' };
for (const m of members(p)) {
  const mine = active.filter((x) => x.assignee === m.id);
  const line = mine.map((x) => `${icon[x.status] || ''}${x.id}`).join(' ') || '— brak otwartych zadań';
  out.push(`  ${m.id.padEnd(11)} ${m.name.split(' ')[0].padEnd(9)} ${line}`);
}
const unassigned = active.filter((x) => !x.assignee);
if (unassigned.length) out.push(`  bez osoby   ${unassigned.map((x) => x.id).join(' ')}`);
const blocked = active.filter((x) => x.status === 'blocked');
if (blocked.length) out.push(`⛔ Zablokowane: ${blocked.map((x) => `${x.id} (${x.assignee || '?'})`).join(', ')}`);
const tdb = active.filter((x) => /^T-DB-/.test(x.id));
if (tdb.length) out.push(`🗄️  Otwarte update danych: ${tdb.map((x) => `${x.id} ${x.status} (${x.assignee || '?'})`).join(', ')}`);

// --- claims ---
const claimsDir = resolve(projectDir, p.coordination?.claims_dir || '.claude/sync/claims');
const staleH = p.modes?.hackathon?.set?.['coordination.stale_after_hours'] ?? p.coordination?.stale_after_hours ?? 1;
if (existsSync(claimsDir)) {
  const claims = readdirSync(claimsDir).filter((f) => f.endsWith('.md')).map((f) => {
    const rel = `${p.coordination.claims_dir}/${f}`;
    const content = readFileSync(resolve(claimsDir, f), 'utf8').split('\n').filter((l) => /^\s*[-*]/.test(l));
    const ts = Number(git(`log -1 --format=%ct -- ${rel}`).trim()) * 1000 || statSync(resolve(claimsDir, f)).mtimeMs;
    return { who: f.replace(/\.md$/, ''), items: content.length, age: t - ts };
  }).filter((c) => c.items);
  if (claims.length) {
    out.push(`\n🔒 Rezerwacje:`);
    for (const c of claims) out.push(`  ${c.who.padEnd(11)} ${c.items} poz., ostatnia zmiana ${fmtDur(c.age)} temu${c.age > staleH * 3600000 ? ` ⚠️ nieaktualna (> ${staleH}h)` : ''}`);
  }
}

// --- messages ---
const open = openMessages(p);
if (open.length) {
  out.push(`\n📨 Wiadomości bez ack: ${open.length}`);
  for (const m of open) {
    const age = (() => { const d = m.name.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/); return d ? t - new Date(`${d[1]}-${d[2]}-${d[3]}T${d[4]}:${d[5]}:00+01:00`) : 0; })();
    const hot = ['blocker', 'breaking_change', 'decision_request'].includes(m.fm.type);
    out.push(`  ${hot ? '🔥' : '·'} ${m.fm.type} ${teamOf(m.fm.from, p) || m.fm.from} → ${m.fm.to}, ${fmtDur(age)} temu: ${m.name}`);
  }
}

// --- validation ---
const { errors, warnings } = validate();
out.push(`\n${errors.length ? `❌ Walidacja: ${errors.length} błędów (node .claude/scripts/validate.mjs)` : '✅ Walidacja repo OK'}${warnings.length ? `, ${warnings.length} ostrzeżeń` : ''}`);

console.log(out.join('\n'));
