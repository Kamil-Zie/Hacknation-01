#!/usr/bin/env node
// Checks consistency of tasks/, contracts/ and .claude/sync/messages/.
// Usage: node .claude/scripts/validate.mjs   (exit 1 on errors; warnings never fail)
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { project, readJson, readTasks, readMessages, members, projectDir } from './lib.mjs';

export function validate() {
  const p = project();
  const errors = [];
  const warnings = [];
  const err = (f, m) => errors.push(`${f}: ${m}`);
  const wrn = (f, m) => warnings.push(`${f}: ${m}`);

  const memberIds = new Set(members(p).map((m) => m.id));
  const teamNames = new Set(Object.keys(p.teams || {}).filter((k) => !k.startsWith('_')));
  const statuses = new Set(p.workflow?.statuses || []);
  const contractStatuses = new Set(p.contracts?.statuses || []);

  // --- contracts ---
  const ids = new Map(); // id -> file
  const contractItems = [];
  const files = { api: ['contracts/api.json', 'endpoints', /^API-\d{3,}$/], dm: ['contracts/data_model.json', 'entities', /^DM-\d{3,}$/] };
  const ui = 'contracts/ui.json';
  const collect = (file, list, re) => {
    for (const it of list || []) {
      if (!it.id) { err(file, 'element bez id'); continue; }
      if (re && !re.test(it.id)) err(file, `${it.id}: zły format id (${re})`);
      if (ids.has(it.id)) err(file, `${it.id}: id występuje dwa razy`);
      ids.set(it.id, file);
      if (it.status && !contractStatuses.has(it.status)) err(file, `${it.id}: nieznany status "${it.status}"`);
      contractItems.push({ file, it });
    }
  };
  let uiDoc = {};
  for (const [file, key, re] of Object.values(files)) {
    if (!existsSync(resolve(projectDir, file))) continue;
    try { collect(file, readJson(file)[key], re); } catch (e) { err(file, `niepoprawny JSON (${e.message})`); }
  }
  if (existsSync(resolve(projectDir, ui))) {
    try {
      uiDoc = readJson(ui);
      collect(ui, uiDoc.components, /^UI-C-\d{3,}$/);
      collect(ui, uiDoc.screens, /^UI-S-\d{3,}$/);
    } catch (e) { err(ui, `niepoprawny JSON (${e.message})`); }
  }
  for (const { file, it } of contractItems) {
    for (const k of ['data_refs', 'consumers', 'api_refs', 'components']) {
      for (const ref of it[k] || []) if (!ids.has(ref)) err(file, `${it.id}.${k}: brak elementu ${ref}`);
    }
  }

  // --- tasks ---
  const tasks = readTasks();
  const taskIds = new Set(tasks.map((t) => t.id));
  const required = ['id', 'title', 'type', 'team', 'status', 'priority', 'depends_on', 'contract_refs', 'acceptance_criteria'];
  for (const t of tasks) {
    if (t._parseError) { err(t.file, `niepoprawny JSON (${t._parseError})`); continue; }
    for (const k of required) if (t[k] === undefined) err(t.file, `brak pola ${k}`);
    if (t.id && t.file !== `tasks/${t.id}.json`) err(t.file, `id "${t.id}" nie zgadza się z nazwą pliku`);
    if (t.status && !statuses.has(t.status)) err(t.file, `nieznany status "${t.status}"`);
    if (t.team && !teamNames.has(t.team)) err(t.file, `nieznany team "${t.team}"`);
    if (t.assignee && !memberIds.has(t.assignee)) err(t.file, `nieznana osoba "${t.assignee}"`);
    for (const d of t.depends_on || []) if (!taskIds.has(d)) err(t.file, `depends_on: brak zadania ${d}`);
    for (const r of t.contract_refs || []) if (!ids.has(r)) err(t.file, `contract_refs: brak elementu kontraktu ${r}`);
    if (['in_progress', 'in_review', 'integration'].includes(t.status) && !t.assignee) err(t.file, `status ${t.status} bez assignee`);
    if (Array.isArray(t.acceptance_criteria) && !t.acceptance_criteria.length) wrn(t.file, 'brak kryteriów akceptacji');
  }

  // --- messages ---
  const types = p.communication?.message_types || {};
  const msgs = readMessages(p);
  const msgIds = new Set(msgs.map((m) => m.name));
  const nameRe = /^\d{8}-\d{4}-[a-z0-9-]+-[a-z_]+$/;
  for (const m of msgs) {
    const f = m.fm;
    if (!m.hasFrontMatter) { err(m.file, 'brak frontmattera (--- ... ---)'); continue; }
    if (!nameRe.test(m.name)) err(m.file, 'nazwa pliku nie pasuje do <YYYYMMDD-HHMM>-<member-id>-<type>.md');
    if (f.id !== m.name) err(m.file, `id "${f.id}" musi być równe nazwie pliku`);
    if (!memberIds.has(f.from)) err(m.file, `nieznany nadawca "${f.from}"`);
    if (!(teamNames.has(f.to) || f.to === 'all')) err(m.file, `nieznany odbiorca "${f.to}"`);
    if (!types[f.type]) err(m.file, `nieznany typ "${f.type}"`);
    if (f.type && !m.name.endsWith(`-${f.type}`)) err(m.file, 'typ w nazwie pliku różni się od pola type');
    if (typeof f.requires_ack !== 'boolean') err(m.file, 'requires_ack musi być true albo false');
    else if (types[f.type]?.requires_ack === true && f.requires_ack === false) wrn(m.file, `typ ${f.type} zwykle wymaga ack`);
    if (f.type === 'ack' && !f.reply_to) err(m.file, 'ack bez reply_to');
    if (f.reply_to && !msgIds.has(f.reply_to)) err(m.file, `reply_to: brak wiadomości ${f.reply_to}`);
    for (const r of [].concat(f.refs || [])) {
      if (!taskIds.has(r) && !ids.has(r)) wrn(m.file, `refs: ${r} nie istnieje (zadanie albo element kontraktu)`);
    }
  }

  // --- claims: one file per member ---
  const claimsDir = resolve(projectDir, p.coordination?.claims_dir || '.claude/sync/claims');
  if (existsSync(claimsDir)) {
    for (const f of readdirSync(claimsDir).filter((x) => x.endsWith('.md'))) {
      if (!memberIds.has(f.replace(/\.md$/, ''))) err(`${p.coordination.claims_dir}/${f}`, 'plik rezerwacji musi nazywać się <member-id>.md');
    }
  }
  return { errors, warnings };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, warnings } = validate();
  for (const w of warnings) console.log(`⚠️  ${w}`);
  for (const e of errors) console.log(`❌ ${e}`);
  console.log(errors.length ? `[validate] ❌ ${errors.length} błędów` : `[validate] ✅ repo spójne${warnings.length ? ` (${warnings.length} ostrzeżeń)` : ''}`);
  process.exit(errors.length ? 1 : 0);
}
