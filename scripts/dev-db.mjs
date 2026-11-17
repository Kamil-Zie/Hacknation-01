#!/usr/bin/env node
// Local dev MongoDB without Docker or a system install.
// Uses mongodb-memory-server: downloads the mongod binary once (~100 MB, cached in ~/.cache),
// then runs it as a plain process. Data persists in .data/mongo (gitignored).
//
// Start:  npm run db         (keep this terminal open; Ctrl+C stops the database)
// Reset:  delete .data/mongo, then npm run db and npm run seed
//
// If MongoDB already runs on the port (e.g. a native install), the script just says so and exits.
import { mkdirSync } from 'node:fs';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.env.MONGO_PORT || 27017);
const dbName = process.env.MONGO_DB || 'hacknation_dev';
const dbPath = resolve(process.cwd(), '.data/mongo');

const portBusy = () => new Promise((ok) => {
  const s = createConnection({ port, host: '127.0.0.1' });
  s.once('connect', () => { s.end(); ok(true); });
  s.once('error', () => ok(false));
});

if (await portBusy()) {
  console.log(`MongoDB already listens on 127.0.0.1:${port}. Using it: mongodb://localhost:${port}/${dbName}`);
  process.exit(0);
}

mkdirSync(dbPath, { recursive: true });
const server = await MongoMemoryServer.create({
  instance: { port, ip: '127.0.0.1', dbName, dbPath, storageEngine: 'wiredTiger' },
});

console.log(`Local MongoDB ready: mongodb://localhost:${port}/${dbName}`);
console.log(`Data: ${dbPath}. Ctrl+C to stop.`);

const stop = async () => { await server.stop({ doCleanup: false }); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
