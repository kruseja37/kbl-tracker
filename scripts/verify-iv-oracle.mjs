#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ORACLE_PATH = 'spec-docs/reference/iv_oracle.json';
const EXPECTED_SHA256 = '7c8fc37a4f1a62c9a4fd39322e469d03a718a6e0143b4816fe18c53ce757ab82';
const EXPECTED_PLAYERS = 440;
const EXPECTED_ANCHORS = 21;

function fail(message) {
  console.error(`[iv-oracle] ${message}`);
  process.exitCode = 1;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) {
    fail(`${label} must be an object`);
    return false;
  }
  return true;
}

function requireFields(value, fields, label) {
  if (!requireRecord(value, label)) return;
  for (const field of fields) {
    if (!(field in value)) {
      fail(`${label} missing ${field}`);
    }
  }
}

const raw = readFileSync(ORACLE_PATH, 'utf8');
const sha256 = createHash('sha256').update(raw).digest('hex');
if (sha256 !== EXPECTED_SHA256) {
  fail(`sha256 mismatch: expected ${EXPECTED_SHA256}, got ${sha256}`);
}

const oracle = JSON.parse(raw);
requireFields(oracle, ['meta', 'anchors', 'players'], 'oracle');

if (!Array.isArray(oracle.anchors)) fail('anchors must be an array');
if (!Array.isArray(oracle.players)) fail('players must be an array');

if (oracle.anchors?.length !== EXPECTED_ANCHORS) {
  fail(`expected ${EXPECTED_ANCHORS} anchors, got ${oracle.anchors?.length}`);
}

if (oracle.players?.length !== EXPECTED_PLAYERS) {
  fail(`expected ${EXPECTED_PLAYERS} players, got ${oracle.players?.length}`);
}

if (oracle.meta?.anchorGate?.passed !== true) {
  fail('meta.anchorGate.passed must be true');
}

if (oracle.meta?.anchorGate?.jonGrayInjuryProneDelta !== -836) {
  fail('meta.anchorGate.jonGrayInjuryProneDelta must be -836');
}

for (const [index, player] of (oracle.players ?? []).entries()) {
  requireFields(
    player,
    ['id', 'name', 'position', 'role', 'rawIV', 'kblIV', 'rawComponents', 'kblComponents', 'input'],
    `players[${index}]`,
  );
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`[iv-oracle] ok ${EXPECTED_PLAYERS} players, ${EXPECTED_ANCHORS} anchors, sha256 ${sha256}`);
