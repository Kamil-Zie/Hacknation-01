#!/usr/bin/env node
// PostToolUse hook for Claude Design (artifacts MCP) tools: records that the tools really work
// in this session. guard-paths.mjs and git-checks.mjs require this proof for the members listed
// in project.json → technologies.frontend.design.required_for.
// Marker: .claude/state/design-mcp.json (gitignored), keyed by session_id.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let data;
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }

const tool = data.tool_name || '';
// Only a successful call counts; a tool error result does not prove access.
const resp = data.tool_response;
const text = typeof resp === 'string' ? resp : JSON.stringify(resp ?? '');
if (/"is_error"\s*:\s*true|not authenticated|unauthorized|forbidden/i.test(text)) process.exit(0);

const file = resolve(projectDir, '.claude/state/design-mcp.json');
let state = { sessions: {} };
try { state = JSON.parse(readFileSync(file, 'utf8')); } catch {}
const now = new Date().toISOString();
state.sessions = Object.fromEntries(Object.entries(state.sessions || {})
  .filter(([, v]) => Date.now() - new Date(v.at).getTime() < 48 * 3600 * 1000)); // keep 48h
state.sessions[data.session_id || 'unknown'] = { at: now, tool, member: process.env.HACK_MEMBER || null };
state.last_ok = { at: now, tool, member: process.env.HACK_MEMBER || null };
mkdirSync(resolve(projectDir, '.claude/state'), { recursive: true });
writeFileSync(file, JSON.stringify(state, null, 2) + '\n');
process.exit(0);
