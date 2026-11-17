// Shared helpers for .claude/scripts/*. No dependencies.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

export const projectDir = process.env.CLAUDE_PROJECT_DIR
  || (() => { try { return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim(); } catch { return process.cwd(); } })();

export const readJson = (rel) => JSON.parse(readFileSync(resolve(projectDir, rel), 'utf8'));
export const project = () => readJson('project.json');

// Env from .claude/settings.local.json (outside a Claude session it is not loaded).
export function loadLocalEnv() {
  try {
    const local = readJson('.claude/settings.local.json');
    for (const [k, v] of Object.entries(local.env || {})) if (!process.env[k] && v) process.env[k] = v;
  } catch {}
}

export function members(p = project()) {
  return Object.entries(p.teams || {}).filter(([k]) => !k.startsWith('_'))
    .flatMap(([team, t]) => (t.members || []).map((m) => ({ ...m, team })));
}
export const teamOf = (memberId, p = project()) => members(p).find((m) => m.id === memberId)?.team;

export const globToRegex = (g) => new RegExp('^' + g
  .replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*') + '$');
export const matchesAny = (file, globs) => globs.some((g) => globToRegex(g).test(file));

export const git = (cmd) => { try { return execSync(`git ${cmd}`, { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
export const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);

// Front matter of a sync message file.
export function parseMessage(raw) {
  raw = raw.replace(/\r\n/g, '\n');
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
  return { fm, body, hasFrontMatter: !!m };
}

export function readMessages(p = project()) {
  const dir = resolve(projectDir, p.communication?.channel || '.claude/sync/messages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const { fm, body, hasFrontMatter } = parseMessage(readFileSync(join(dir, f), 'utf8'));
    return { file: `${p.communication?.channel || '.claude/sync/messages'}/${f}`, name: f.replace(/\.md$/, ''), fm, body, hasFrontMatter };
  });
}

// Messages that still wait for an ack.
export function openMessages(p = project()) {
  const msgs = readMessages(p);
  const acked = new Set(msgs.filter((m) => m.fm.type === 'ack' && m.fm.reply_to).map((m) => m.fm.reply_to));
  return msgs.filter((m) => m.fm.requires_ack === true && !acked.has(m.fm.id || m.name));
}

export function readTasks() {
  const dir = resolve(projectDir, 'tasks');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort().map((f) => {
    try { return { file: `tasks/${f}`, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }; }
    catch (e) { return { file: `tasks/${f}`, _parseError: e.message }; }
  });
}

// Current time; HACK_NOW overrides it for testing ("2026-11-22T07:30:00+01:00").
export const now = () => (process.env.HACK_NOW ? new Date(process.env.HACK_NOW) : new Date());

export function freezeAt(p = project()) {
  const ms = p.modes?.hackathon?.clock?.milestones || [];
  const f = ms.find((m) => /zamro/i.test(m.name));
  return f ? new Date(f.at) : null;
}

export const warsawStamp = (d = now()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${parts.year}${parts.month}${parts.day}-${parts.hour === '24' ? '00' : parts.hour}${parts.minute}`;
};
