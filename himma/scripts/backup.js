#!/usr/bin/env node
/**
 * PostgreSQL backup script for Himma.
 * Uses pg_dump when available; falls back to Prisma JSON export.
 *
 * Usage:
 *   node scripts/backup.js
 *   BACKUP_RETENTION_DAYS=14 node scripts/backup.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10);
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const sqlPath = path.join(BACKUP_DIR, `himma-${stamp}.sql.gz`);

function runPgDump() {
  try {
    execSync('pg_dump --version', { stdio: 'ignore' });
  } catch {
    return false;
  }
  const result = spawnSync(
    'pg_dump',
    [DATABASE_URL, '--no-owner', '--no-acl'],
    { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    console.error('pg_dump failed:', result.stderr?.toString());
    return false;
  }
  const zlib = require('zlib');
  fs.writeFileSync(sqlPath, zlib.gzipSync(result.stdout));
  console.log(`Backup saved: ${sqlPath}`);
  return true;
}

async function runJsonFallback() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const jsonPath = path.join(BACKUP_DIR, `himma-${stamp}.json`);
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      users: await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          createdAt: true,
          profile: true,
          foodLogs: true,
          waterLogs: true,
          weightEntries: true,
          customFoods: true,
          coachMessages: true,
          waterReminder: true,
        },
      }),
    };
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`JSON backup saved (no pg_dump): ${jsonPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

function cleanupOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(BACKUP_DIR)) {
    const full = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(full);
      console.log(`Removed old backup: ${file}`);
    }
  }
}

(async () => {
  const ok = runPgDump();
  if (!ok) await runJsonFallback();
  cleanupOldBackups();
})();
