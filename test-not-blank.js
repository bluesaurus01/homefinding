#!/usr/bin/env node
/**
 * Verifies the app serves a non-blank page: checks for expected HTML content.
 * Run: node test-not-blank.js
 * Requires server to be running on port 3000 (npm start in another terminal),
 * or set BASE_URL.
 */
const http = require('http');
const BASE = process.env.BASE_URL || 'http://localhost:3080';

const requiredStrings = [
  '집잡아',
  '지역을 선택',
  'AI 부동산',
  '재정·설정',
  '매물 목록',
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.get(
      { hostname: u.hostname, port: u.port || 80, path: u.pathname || '/', method: 'GET' },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log('Fetching', BASE, '...');
  const { statusCode, body } = await fetch(BASE);
  if (statusCode !== 200) {
    console.error('FAIL: status', statusCode);
    process.exit(1);
  }
  const len = body.length;
  if (len < 500) {
    console.error('FAIL: response too short (' + len + ' bytes), likely blank');
    process.exit(1);
  }
  const missing = requiredStrings.filter((s) => !body.includes(s));
  if (missing.length) {
    console.error('FAIL: missing expected content:', missing.join(', '));
    process.exit(1);
  }
  console.log('OK: page has content (length:', len, '), all required strings found.');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
