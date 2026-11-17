#!/usr/bin/env node
// PreToolUse(Bash) hook: blocks `git commit` that changes database files
// (project.json → data_updates.watched_paths) without a data-update task tasks/T-DB-*.json
// in the same commit. Exit code 2 = Claude Code rejects the call and shows stderr to the agent.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let data;
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const cmd = data.tool_input?.command || '';
if (!/\bgit\b[^;&|]*\bcommit\b/.test(cmd)) process.exit(0);

let cfg;
try { cfg = JSON.parse(readFileSync(resolve(projectDir, 'project.json'), 'utf8')).data_updates; } catch { process.exit(0); }
if (!cfg || cfg.enforce === false) process.exit(0);

const git = (c) => { try { return execSync(c, { cwd: projectDir, encoding: 'utf8' }); } catch { return ''; } };
const lines = (s) => s.split('\n').filter(Boolean);

// Files that will end up in the commit. If the same command stages files (git add / commit -a),
// the working tree counts too, because this hook runs before the command.
let files = lines(git('git diff --cached --name-only'));
if (/\bgit\s+add\b|\bcommit\b[^;&|]*\s-(a|[a-z]*a[a-z]*)\b|--all\b/.test(cmd)) {
  files = files.concat(lines(git('git status --porcelain --untracked-files=all'))
    .map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')));
}
files = [...new Set(files)];

const globToRegex = (g) => new RegExp('^' + g
  .replace(/[.+^${}()|[\]\\]/g, '\\$&')
  .replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
const dataFiles = files.filter((f) => cfg.watched_paths.some((g) => globToRegex(g).test(f)));
if (!dataFiles.length) process.exit(0);

const hasTask = files.some((f) => /^tasks\/T-DB-\d+\.json$/.test(f));
if (hasTask) process.exit(0);

process.stderr.write(
  `Commit zmienia bazę danych (${dataFiles.join(', ')}), ale nie zawiera zadania update danych.\n` +
  `Każda zmiana w bazie wymaga zadania tasks/T-DB-*.json w tym samym commicie (project.json → data_updates).\n` +
  `Utwórz je:  node .claude/scripts/new-data-task.mjs --title "<co się zmieniło>" [--refs DM-001] [--breaking]\n` +
  `potem git add tasks/T-DB-*.json i powtórz commit. Jeśli zadanie już istnieje i tylko je realizujesz, dopisz notatkę w jego "notes" i dodaj plik do commita.\n`);
process.exit(2);
