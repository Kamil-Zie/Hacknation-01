#!/usr/bin/env node
// Discord reminders for hackathon phases and milestones (project.json → modes.hackathon.clock).
// Run by .github/workflows/milestone-reminders.yml every 15 minutes during the event.
//
// Sends what falls into the 15-minute slot that just ended (slot-15min, slot]:
//   - every milestone: 60 minutes before and at the time
//   - every phase: when it starts (hackathon start = first phase)
// Usage:
//   node .claude/scripts/milestone-reminder.mjs            send due reminders (DISCORD_WEBHOOK_SYNC)
//   node .claude/scripts/milestone-reminder.mjs --dry-run  print instead of sending
//   node .claude/scripts/milestone-reminder.mjs --list     list all planned reminders
//   node .claude/scripts/milestone-reminder.mjs --test     send one test reminder now
import { project, now } from './lib.mjs';

const p = project();
const clock = p.modes.hackathon.clock;
const tpl = p.communication?.discord?.template || {};
const args = process.argv.slice(2);
const hhmm = (d) => d.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'long', hour: '2-digit', minute: '2-digit' });

const events = [];
let prev = new Date(clock.started_at);
for (const ph of clock.phases) {
  events.push({ at: prev, color: '#57F287', title: `🚦 Start fazy: ${ph.name}`, text: `Do ${hhmm(new Date(ph.until))}.\n\n**Cel:** ${ph.goal}` });
  prev = new Date(ph.until);
}
for (const m of clock.milestones) {
  const at = new Date(m.at);
  events.push({ at: new Date(at.getTime() - 3600000), color: '#FEE75C', title: `⏰ Za godzinę: ${m.name}`, text: `${hhmm(at)}.\n\n**Do zrobienia:** ${m.goal}` });
  events.push({ at, color: '#ED4245', title: `🎯 Teraz: ${m.name}`, text: m.goal });
}
events.sort((a, b) => a.at - b.at);

if (args.includes('--list')) {
  for (const e of events) console.log(`${hhmm(e.at).padEnd(22)} ${e.title}`);
  process.exit(0);
}

const slotMs = 15 * 60000;
const t = now().getTime();
const slot = Math.floor(t / slotMs) * slotMs;
const due = args.includes('--test')
  ? [{ at: new Date(), color: '#95A5A6', title: '🧪 [TEST] Przypomnienie o kamieniu milowym', text: 'Jeśli to widzisz, przypomnienia z GitHub Actions działają.' }]
  : events.filter((e) => e.at.getTime() > slot - slotMs && e.at.getTime() <= slot);

if (!due.length) { console.log('Nothing due in this slot.'); process.exit(0); }

let url = (process.env.DISCORD_WEBHOOK_SYNC || '').trim().replace(/^["']|["']$/g, '');
// Missing or malformed webhook must be visible as a failed run, not a green one that sent nothing.
if (!args.includes('--dry-run')) {
  if (!url) {
    console.error('DISCORD_WEBHOOK_SYNC is not set (GitHub: Settings → Secrets and variables → Actions → New repository secret). Nothing was sent.');
    process.exit(1);
  }
  if (!/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+/.test(url)) {
    console.error(`DISCORD_WEBHOOK_SYNC is not a Discord webhook URL (length ${url.length}, ${url.startsWith('https://') ? 'starts with https:// but the path is wrong' : 'does not start with https://'}). ` +
      'The secret value must be the full address: https://discord.com/api/webhooks/<id>/<token>. Nothing was sent.');
    process.exit(1);
  }
}
for (const e of due) {
  const payload = {
    username: 'HackNation',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: e.title,
      description: e.text,
      color: parseInt(e.color.slice(1), 16),
      footer: { text: `${tpl.footer || 'HackNation'} · harmonogram z project.json` },
      timestamp: new Date().toISOString(),
    }],
  };
  if (args.includes('--dry-run') || !url) { console.log(url ? '' : 'No DISCORD_WEBHOOK_SYNC, printing only.'); console.log(JSON.stringify(payload, null, 2)); continue; }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) { console.error(`Discord error ${res.status}: ${await res.text()}`); process.exitCode = 1; }
  else console.log(`Sent: ${e.title}`);
}
