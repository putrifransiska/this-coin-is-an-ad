// Pins the $AD logo, then its token metadata (pointing at the logo), to IPFS through Pinata.
// usage: node coin/pin.mjs <logo.png> <env file holding PINATA_JWT> <out.json>
// Only PINATA_JWT is read from the env file, and it is never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [logoPath, envPath, outPath] = process.argv.slice(2);
if (!logoPath || !envPath || !outPath) {
  console.error('usage: node coin/pin.mjs <logo.png> <env file> <out.json>');
  process.exit(2);
}
const line = readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith('PINATA_JWT='));
if (!line) throw new Error('PINATA_JWT is not in the env file');
const jwt = line.slice('PINATA_JWT='.length).trim().replace(/^["']|["']$/g, '');
const GATEWAY = 'https://gateway.pinata.cloud/ipfs/'; // ipfs.io rate-limits this machine

async function pinata(path, body, headers = {}) {
  const res = await fetch(`https://api.pinata.cloud${path}`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}`, ...headers }, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`Pinata ${path} answered ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const meta = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'metadata.json'), 'utf8'));
const LINK = 'https://make.fun/bounty/makefun-coin-promo-01';
if (!meta.description.includes(LINK) || meta.website !== LINK) throw new Error('bounty link or website missing');
if (!/only an ad for make\.fun/.test(meta.description)) throw new Error('the ad-only disclaimer is missing');

const png = readFileSync(logoPath);
const form = new FormData();
form.append('file', new Blob([png], { type: 'image/png' }), basename(logoPath));
form.append('pinataMetadata', JSON.stringify({ name: 'ad-logo.png' }));
const image = await pinata('/pinning/pinFileToIPFS', form);
meta.image = GATEWAY + image.IpfsHash;
const metaPin = await pinata('/pinning/pinJSONToIPFS',
  JSON.stringify({ pinataContent: meta, pinataMetadata: { name: 'ad-metadata.json' } }), { 'Content-Type': 'application/json' });

const out = { image_cid: image.IpfsHash, image_url: meta.image, image_bytes: png.length, metadata_cid: metaPin.IpfsHash,
  metadata_uri: GATEWAY + metaPin.IpfsHash, metadata: meta };
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ image_url: out.image_url, metadata_uri: out.metadata_uri, image_bytes: out.image_bytes }));
