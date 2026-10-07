#!/usr/bin/env node
/**
 * Simple daily backup scheduler (runs backup.js every 24h).
 * For production, prefer cron / Task Scheduler / cloud scheduler instead.
 */
const { spawn } = require('child_process');
const path = require('path');

const INTERVAL_MS = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10) * 60 * 60 * 1000;

function runBackup() {
  const child = spawn(process.execPath, [path.join(__dirname, 'backup.js')], {
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    console.log(`[scheduler] backup exited with code ${code}`);
  });
}

console.log(`[scheduler] Himma backup every ${INTERVAL_MS / 3600000}h`);
runBackup();
setInterval(runBackup, INTERVAL_MS);
