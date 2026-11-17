#!/usr/bin/env node
// Creates the mandatory data-update task (tasks/T-DB-NNN.json) for a database change.
// Rules come from project.json → data_updates.
//
// Usage:
//   node .claude/scripts/new-data-task.mjs --title "Add status field to Item" [--refs DM-001,API-002] [--breaking]
//
// Changed data files are detected from git (staged + unstaged + untracked vs HEAD).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const project = JSON.parse(readFileSync(resolve(projectDir, 'project.json'), 'utf8'));
const cfg = project.data_updates;
if (!cfg) { console.error('project.json has no data_updates section.'); process.exit(1); }

const title = opt('--title');
if (!title) { console.error('Usage: node .claude/scripts/new-data-task.mjs --title "<what changed>" [--refs DM-001,API-002] [--breaking]'); process.exit(1); }

const globToRegex = (g) => new RegExp('^' + g
  .replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
const isData = (f) => cfg.watched_paths.some((g) => globToRegex(g).test(f));

const git = (c) => { try { return execSync(c, { cwd: projectDir, encoding: 'utf8' }); } catch { return ''; } };
const changed = [...new Set(git('git status --porcelain --untracked-files=all')
  .split('\n').filter(Boolean).map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')))]
  .filter(isData);

const nums = readdirSync(resolve(projectDir, 'tasks'))
  .map((f) => f.match(/^T-DB-(\d+)\.json$/)).filter(Boolean).map((m) => Number(m[1]));
const id = `T-DB-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;

let dmVersion = null;
try { dmVersion = JSON.parse(readFileSync(resolve(projectDir, 'contracts/data_model.json'), 'utf8')).version; } catch {}

const refs = (opt('--refs') || '').split(',').map((s) => s.trim()).filter(Boolean);
const member = process.env.HACK_MEMBER || null;
const today = new Date().toISOString().slice(0, 10);
const breaking = args.includes('--breaking');

const task = {
  id,
  title: `[DATA] ${title}`,
  description: `Obowiązkowe zadanie update danych po zmianie w bazie. Zmienione pliki: ${changed.join(', ') || '(brak wykrytych, uzupełnij)'}.`,
  type: 'data_update',
  team: cfg.task.team,
  assignee: member && member.startsWith('backend') ? member : cfg.task.default_assignee,
  status: 'ready',
  priority: breaking ? 'critical' : cfg.task.priority,
  depends_on: [],
  contract_refs: refs,
  data_change: {
    changed_files: changed,
    data_model_version: dmVersion,
    breaking,
    created_by: member,
  },
  acceptance_criteria: [...cfg.task.acceptance_criteria, ...(breaking ? cfg.task.breaking_extra_criteria : [])],
  review: { status: 'pending', by: null, note: '' },
  notes: [],
  created_at: today,
  updated_at: today,
};

const path = `tasks/${id}.json`;
writeFileSync(resolve(projectDir, path), JSON.stringify(task, null, 2) + '\n');
console.log(`Created ${path}. Stage it in the same commit as the database change: git add ${path}`);
