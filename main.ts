// $AD ("This Coin Is An Ad") for the make.fun bounty makefun-coin-promo-01.
// The coin itself is the entry; this program only hands LAUNCH.json (its mint and create signature) to the grader,
// after checking the shapes the scorer checks, so a broken file fails here with a reason instead of silently.
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

function fail(why: string): never {
  console.error(`LAUNCH.json: ${why}`);
  process.exit(1);
}

let raw: string;
try {
  raw = readFileSync(join(BOT_DIR, 'LAUNCH.json'), 'utf8');
} catch (err) {
  fail(`could not be read from ${BOT_DIR}: ${(err as Error).message}`);
}
if (Buffer.byteLength(raw) > 16384) fail('is over 16384 bytes');
const launch = JSON.parse(raw) as { mint?: unknown; create_signature?: unknown };
const { mint, create_signature: sig } = launch;
if (typeof mint !== 'string' || !BASE58.test(mint) || mint.length < 32 || mint.length > 44) fail('mint is not a base58 address');
if (typeof sig !== 'string' || !BASE58.test(sig) || sig.length < 64 || sig.length > 88) fail('create_signature is not a base58 signature');

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'LAUNCH.json'), raw);
console.log(`handed in $AD: mint ${mint}`);
