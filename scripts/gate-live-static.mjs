#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? process.cwd());
const productionFiles = [
  'src/web/App.tsx',
  'src/web/surfaces/Field.tsx',
  'src/web/surfaces/Flow.tsx',
  'src/web/surfaces/Review.tsx',
  'src/web/surfaces/Output.tsx',
];
const forbidden = [
  ['TAROKE RIMIXER', 'demo project literal'],
  ['demo-fixture-base-hash', 'demo canonical hash'],
  ['demo-review-base-hash', 'demo review hash'],
  ['DEMO_LADDER_SECTIONS', 'demo handoff content'],
  ['DEMO_TERMS', 'demo handoff terms'],
];

let failed = false;
for (const relativePath of productionFiles) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    console.error(`GATE-LIVE FAIL: missing production source ${relativePath}`);
    failed = true;
    continue;
  }
  const source = readFileSync(path, 'utf8');
  for (const [marker, meaning] of forbidden) {
    if (source.includes(marker)) {
      console.error(`GATE-LIVE FAIL: ${relativePath} contains ${meaning}: ${marker}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('GATE-LIVE static scan PASS: known production demo markers absent.');
