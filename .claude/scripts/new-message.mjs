#!/usr/bin/env node
// Creates a sync message with a correct name, id and front matter, and optionally notifies Discord.
//
// Usage:
//   node .claude/scripts/new-message.mjs --type handoff --to frontend --refs T-004,API-002 \
//     --title "Endpoint listy zgłoszeń" --body "Intro...\n\n## Zrobione\n- ..." [--ack true|false] [--notify|--no-notify]
//   node .claude/scripts/new-message.mjs --type ack --reply-to 20261121-1430-frontend-2-handoff --to frontend --body "OK"
//   --body-file <path>  read the body from a file instead of --body ("\n" in --body becomes a new line)
//
// Discord: sent automatically for types in communication.discord.when (blocker, breaking_change,
// decision_request, handoff) unless --no-notify; --notify forces it for other types.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { project, loadLocalEnv, members, warsawStamp, projectDir, now } from './lib.mjs';

loadLocalEnv();
const p = project();
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const die = (m) => { console.error(m); process.exit(1); };

const from = opt('--from') || process.env.HACK_MEMBER;
const type = opt('--type');
const to = opt('--to');
const types = p.communication.message_types;
const teams = Object.keys(p.teams).filter((k) => !k.startsWith('_'));

if (!members(p).some((m) => m.id === from)) die(`Nieznany nadawca "${from}". Ustaw HACK_MEMBER albo --from.`);
if (!types[type]) die(`Nieznany typ "${type}". Dostępne: ${Object.keys(types).join(', ')}`);
if (!teams.includes(to) && to !== 'all') die(`Nieznany odbiorca "${to}". Dostępne: ${[...teams, 'all'].join(', ')}`);
const replyTo = opt('--reply-to');
if (type === 'ack' && !replyTo) die('ack wymaga --reply-to <id wiadomości>.');

let body = opt('--body-file') ? readFileSync(resolve(opt('--body-file')), 'utf8') : (opt('--body') || '').replace(/\\n/g, '\n');
if (!body.trim()) die('Podaj treść: --body "..." albo --body-file <plik>.');
const ackOpt = opt('--ack');
const requiresAck = ackOpt ? ackOpt === 'true' : !!types[type].requires_ack;
const refs = (opt('--refs') || '').split(',').map((s) => s.trim()).filter(Boolean);
const title = opt('--title');

const dir = resolve(projectDir, p.communication.channel);
mkdirSync(dir, { recursive: true });
// Same minute, same sender, same type already exists: use the next free minute.
let t = now();
let id = `${warsawStamp(t)}-${from}-${type}`;
while (existsSync(resolve(dir, `${id}.md`))) { t = new Date(t.getTime() + 60000); id = `${warsawStamp(t)}-${from}-${type}`; }

const fm = [
  '---', `id: ${id}`, `from: ${from}`, `to: ${to}`, `type: ${type}`,
  ...(title ? [`title: ${title}`] : []),
  `refs: [${refs.join(', ')}]`,
  `requires_ack: ${requiresAck}`,
  ...(replyTo ? [`reply_to: ${replyTo}`] : []),
  '---',
].join('\n');
const rel = `${p.communication.channel}/${id}.md`;
writeFileSync(resolve(projectDir, rel), `${fm}\n${body.trim()}\n`);
console.log(`Created ${rel}. Commit it together with the change it describes.`);

const when = p.communication.discord?.when || [];
const notify = !args.includes('--no-notify') && (args.includes('--notify') || when.includes(type));
if (notify) {
  try { execFileSync(process.execPath, [resolve(projectDir, '.claude/scripts/discord-notify.mjs'), rel], { stdio: 'inherit', cwd: projectDir }); }
  catch { console.error('Discord notification failed (the message file is created anyway).'); }
}
