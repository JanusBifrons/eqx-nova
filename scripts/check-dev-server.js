#!/usr/bin/env node

import { spawn } from 'child_process';
import http from 'http';

const DEFAULT_PORT = 3000;

function checkPort(port) {
  return new Promise(resolve => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: port,
        method: 'GET',
        timeout: 1000,
      },
      res => {
        resolve(true);
      }
    );

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('🔍 Checking if dev server is already running...');

  const isRunning = await checkPort(DEFAULT_PORT);

  if (isRunning) {
    console.log(
      `✅ Dev server already running at http://localhost:${DEFAULT_PORT}`
    );
    console.log('No need to start a new one!');
    process.exit(0);
  } else {
    console.log(`🚀 Starting dev server on port ${DEFAULT_PORT}...`);
    const child = spawn('npx', ['vite'], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', code => {
      process.exit(code);
    });

    child.on('error', error => {
      console.error('Error starting dev server:', error);
      process.exit(1);
    });
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
