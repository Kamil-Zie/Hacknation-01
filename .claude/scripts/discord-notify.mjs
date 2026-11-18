#!/usr/bin/env node
// Sends a sync message (.claude/sync/messages/*.md) to Discord as an embed built from
// project.json → communication.discord.template. No dependencies.
//
// Usage:
//   node .claude/scripts/discord-notify.mjs <message-file.md> [--channel <team>] [--test] [--dry-run]
//
// --channel  webhook to use: backend | frontend | coordinator | sync (default: template.default_channel)
//            falls back to DISCORD_WEBHOOK_SYNC when the chosen webhook is not set
// --test     marks the notification as a test (prefix + footer from the template)
// --dry-run  prints the JSON payload instead of sending it
//
// Body format of the message file (all optional):
//   intro text            -> embed description (under the "from → to" line)
//   ## Zrobione           -> embed field; emoji taken from template.sections
//   ## Potrzebuję od ...  -> embed field
// Refs and Ack fields are added automatically from frontmatter.
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { loadLocalEnv } from './lib.mjs';

loadLocalEnv();

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--channel');

if (!file) {
  console.error('Usage: node .claude/scripts/discord-notify.mjs <message-file.md> [--channel <team>] [--test] [--dry-run]');
  process.exit(1);
}

const project = JSON.parse(readFileSync(resolve(projectDir, 'project.json'), 'utf8'));
const discord = project.communication?.discord || {};
const tpl = discord.template || {};
if (discord.enabled === false) { console.log('Discord disabled in project.json, skipping.'); process.exit(0); }

// --- parse message file -------------------------------------------------------
const raw = readFileSync(resolve(projectDir, file), 'utf8').replace(/\r\n/g, '\n');
const fm = {};
let body = raw;
const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
if (m) {
  body = m[2];
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    else if (v === 'true' || v === 'false') v = v === 'true';
    else v = v.replace(/^["']|["']$/g, '');
    fm[kv[1]] = v;
  }
}
fm.id ||= basename(file, '.md');
const type = fm.type || 'info';
const refs = Array.isArray(fm.refs) ? fm.refs : fm.refs ? [fm.refs] : [];

// --- who is who -----------------------------------------------------------------
const members = Object.entries(project.teams || {})
  .filter(([k]) => !k.startsWith('_'))
  .flatMap(([team, t]) => (t.members || []).map((mm) => ({ ...mm, team })));
const sender = members.find((mm) => mm.id === fm.from);
const fullName = sender?.name || fm.from || 'HackNation';
const firstName = fullName.split(' ')[0];

// --- body -> description + sections ----------------------------------------------
const sectionEmoji = (name) => {
  const n = name.toLowerCase();
  const hit = Object.entries(tpl.sections || {}).find(([k]) => n.startsWith(k.toLowerCase()));
  return hit ? hit[1] : (tpl.default_section_emoji || '▪️');
};
const parts = body.split(/^##\s+/m);
const intro = parts.shift().trim();
const sections = parts.map((p) => {
  const [head, ...rest] = p.split('\n');
  return { name: head.trim(), value: rest.join('\n').trim() };
}).filter((s) => s.name);

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const typeCfg = tpl.types?.[type] || {};
const taskRef = refs.find((r) => /^T-/.test(r)) || refs[0];
const title = [typeCfg.label || type, taskRef, fm.title].filter(Boolean).join(' · ');
const toLabel = fm.to || '?';

const description = [`${firstName} (${fm.from || '?'}) → ${toLabel}`, intro].filter(Boolean).join('\n\n');

const fields = sections.map((s) => ({
  name: clip(`${sectionEmoji(s.name)} ${s.name}`, 256),
  value: clip(s.value || '—', 1024),
}));
if (refs.length) fields.push({ name: `${tpl.sections?.Refs || '📌'} Refs`, value: clip(refs.join(', '), 1024) });
if (type === 'ack' && fm.reply_to) fields.push({ name: `${tpl.sections?.['Odpowiedź na'] || '↩️'} Odpowiedź na`, value: fm.reply_to });
else fields.push({
  name: `${tpl.sections?.Ack || '⏱️'} Ack`,
  value: fm.requires_ack === true ? (tpl.ack_labels?.required || 'wymagany') : (tpl.ack_labels?.not_required || 'niewymagany'),
});

const test = flag('--test');
const content = test
  ? `${tpl.test?.emoji || '🧪'} **${tpl.test?.prefix || '[TEST]'} ${typeCfg.label || type} — ${firstName} (${fm.from})**`
  : `${typeCfg.emoji || '📨'} **${typeCfg.label || type} — ${firstName} (${fm.from})**`;
const footer = test
  ? `${tpl.footer || 'HackNation'} · ${tpl.test?.footer || 'wiadomość testowa, można zignorować'}`
  : `${tpl.footer || 'HackNation'} · ${fm.id}`;

const payload = {
  username: firstName,
  content: clip(content, 2000),
  allowed_mentions: { parse: [] },
  embeds: [{
    title: clip(title, 256),
    description: clip(description, 4096),
    color: parseInt(String(typeCfg.color || '#5865F2').replace('#', ''), 16),
    fields: fields.slice(0, 25),
    footer: { text: clip(footer, 2048) },
    timestamp: new Date().toISOString(),
  }],
};

if (flag('--dry-run')) { console.log(JSON.stringify(payload, null, 2)); process.exit(0); }

// --- send -------------------------------------------------------------------------------
const channel = opt('--channel') || tpl.default_channel || 'sync';
const envName = discord.webhook_env?.[channel];
const url = (envName && process.env[envName]) || process.env[discord.webhook_env?.sync || 'DISCORD_WEBHOOK_SYNC'];
if (!url) { console.log(`No webhook set (${envName || channel}), skipping Discord notification.`); process.exit(0); }

const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if (!res.ok) { console.error(`Discord error ${res.status}: ${await res.text()}`); process.exit(1); }
console.log(`Sent ${fm.id} to Discord (${channel}).`);
