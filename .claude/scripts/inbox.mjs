#!/usr/bin/env node
// Open sync messages: addressed to my team (or all) and still waiting for an ack,
// plus my own messages that nobody has acked yet.
// Usage: node .claude/scripts/inbox.mjs [--team backend] [--all]
//   --all  also show messages without requires_ack from the last 3 hours
import { project, loadLocalEnv, teamOf, readMessages, openMessages, now } from './lib.mjs';

loadLocalEnv();
const p = project();
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const member = process.env.HACK_MEMBER;
const team = opt('--team') || teamOf(member, p);
if (!team) { console.error('Nie wiem, czyja to skrzynka: ustaw HACK_MEMBER albo podaj --team <team>.'); process.exit(1); }

const fmt = (m) => {
  const title = m.fm.title ? ` · ${m.fm.title}` : '';
  const refs = [].concat(m.fm.refs || []).join(', ');
  const first = m.body.trim().split('\n').find((l) => l.trim() && !l.startsWith('#')) || '';
  return `  ${m.fm.type}${title} — od ${m.fm.from}${refs ? ` [${refs}]` : ''}\n    ${m.file}\n    ${first.slice(0, 140)}`;
};

const open = openMessages(p);
const toMe = open.filter((m) => (m.fm.to === team || m.fm.to === 'all') && teamOf(m.fm.from, p) !== team);
const mine = open.filter((m) => teamOf(m.fm.from, p) === team);

const priority = ['blocker', 'breaking_change', 'decision_request', 'question', 'contract_proposal'];
toMe.sort((a, b) => (priority.indexOf(a.fm.type) + 99) % 99 - (priority.indexOf(b.fm.type) + 99) % 99);

console.log(`[inbox] team ${team}${member ? ` (${member})` : ''}`);
console.log(toMe.length ? `\n📥 Czeka na Wasz ack (${toMe.length}):\n${toMe.map(fmt).join('\n')}` : '\n📥 Nic nie czeka na Wasz ack.');
if (mine.length) console.log(`\n📤 Wasze wiadomości bez ack (${mine.length}):\n${mine.map(fmt).join('\n')}`);

if (args.includes('--all')) {
  const since = now().getTime() - 3 * 3600 * 1000;
  const recent = readMessages(p).filter((m) => (m.fm.to === team || m.fm.to === 'all') && !m.fm.requires_ack && m.fm.type !== 'ack')
    .filter((m) => { const d = m.name.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/); return d && new Date(`${d[1]}-${d[2]}-${d[3]}T${d[4]}:${d[5]}:00+01:00`).getTime() >= since; });
  if (recent.length) console.log(`\nℹ️  Informacje z ostatnich 3h (${recent.length}):\n${recent.map(fmt).join('\n')}`);
}
if (toMe.length) console.log(`\nOdpowiedz: node .claude/scripts/new-message.mjs --type ack --reply-to <id> --to <team> --body "..."`);
