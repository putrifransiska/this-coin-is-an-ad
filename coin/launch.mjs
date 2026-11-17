// Creates $AD on pump.fun with create_v2 and NO first buy. The agent wallet signs and pays; the coin's creator is the
// make.fun account's own sign-in wallet. Simulates by default; --send sends it. Refuses to spend over 0.007 SOL.
// usage: node coin/launch.mjs <agent keypair.json> <mint keypair.json> <pinned.json> <creator pubkey> [--send]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url);
const { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } =
  require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');

const [agentPath, mintPath, pinnedPath, creatorArg, ...flags] = process.argv.slice(2);
const SEND = flags.includes('--send');
const MAX_COST_LAMPORTS = 7_000_000; // the 0.007 SOL cap for this coin, network fee included
const RENT_EXEMPT_MIN = 890_880;

const PUMP = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const MAYHEM = new PublicKey('MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e');
const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const DISC_CREATE_V2 = Buffer.from([214, 144, 76, 236, 95, 139, 49, 180]);

const loadKey = (p) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, 'utf8'))));
const agent = loadKey(agentPath);
let mint;
if (existsSync(mintPath)) mint = loadKey(mintPath);
else {
  mint = Keypair.generate();
  writeFileSync(mintPath, JSON.stringify([...mint.secretKey]), { mode: 0o600, flag: 'wx' });
}
const creator = new PublicKey(creatorArg);
const pinned = JSON.parse(readFileSync(pinnedPath, 'utf8'));
const { name, symbol } = pinned.metadata;
const uri = pinned.metadata_uri;
if (name.length > 32 || symbol.length > 10) throw new Error('name or symbol too long for pump.fun');

const pda = (seeds, program) => PublicKey.findProgramAddressSync(seeds, program)[0];
const b = (t) => Buffer.from(t);
const bondingCurve = pda([b('bonding-curve'), mint.publicKey.toBuffer()], PUMP);
const solVault = pda([b('sol-vault')], MAYHEM);
const keys = [
  [mint.publicKey, true, true],
  [pda([b('mint-authority')], PUMP), false, false],
  [bondingCurve, true, false],
  [getAssociatedTokenAddressSync(mint.publicKey, bondingCurve, true, TOKEN_2022, ATA_PROGRAM), true, false],
  [pda([b('global')], PUMP), false, false],
  [agent.publicKey, true, true],
  [SystemProgram.programId, false, false],
  [TOKEN_2022, false, false],
  [ATA_PROGRAM, false, false],
  [MAYHEM, true, false],
  [pda([b('global-params')], MAYHEM), false, false],
  [solVault, true, false],
  [pda([b('mayhem-state'), mint.publicKey.toBuffer()], MAYHEM), true, false],
  [getAssociatedTokenAddressSync(mint.publicKey, solVault, true, TOKEN_2022, ATA_PROGRAM), true, false],
  [pda([b('__event_authority')], PUMP), false, false],
  [PUMP, false, false],
].map(([pubkey, isWritable, isSigner]) => ({ pubkey, isWritable, isSigner }));

const str = (t) => {
  const bytes = Buffer.from(t, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
};
const data = Buffer.concat([
  DISC_CREATE_V2, str(name), str(symbol), str(uri), creator.toBuffer(),
  Buffer.from([0]), // is_mayhem_mode: false
  Buffer.from([0]), // is_cashback_enabled: None
  Buffer.alloc(8), // creator_fee_bps: 0
  Buffer.from([0]), // is_holder_reward: None
]);
const ix = new TransactionInstruction({ programId: PUMP, keys, data }); // the only instruction: no buy follows

const conn = new Connection(process.env.RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
const before = await conn.getBalance(agent.publicKey);
const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
const msg = new TransactionMessage({ payerKey: agent.publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
const tx = new VersionedTransaction(msg);
tx.sign([agent, mint]);

const sim = await conn.simulateTransaction(tx, {
  sigVerify: false, replaceRecentBlockhash: true,
  accounts: { encoding: 'base64', addresses: [agent.publicKey.toBase58()] },
});
const fee = (await conn.getFeeForMessage(msg, 'confirmed')).value;
const after = sim.value.accounts?.[0]?.lamports;
console.log(JSON.stringify({ agent: agent.publicKey.toBase58(), creator: creator.toBase58(), mint: mint.publicKey.toBase58(),
  name, symbol, uri, sim_err: sim.value.err, units: sim.value.unitsConsumed, fee, balance_before: before, balance_after_sim: after }, null, 2));
if (sim.value.err) {
  console.log((sim.value.logs ?? []).join('\n'));
  process.exit(1);
}
const total = before - after + fee;
if (total > MAX_COST_LAMPORTS) throw new Error(`cost ${total} lamports is over the 0.007 SOL cap`);
if (before - total < RENT_EXEMPT_MIN) throw new Error('the agent wallet would fall under the rent-exempt minimum');
console.log(`projected total cost: ${total} lamports (${total / 1e9} SOL), left: ${before - total}`);
if (!SEND) {
  console.log('simulation only: pass --send to launch');
  process.exit(0);
}
const signature = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 5 });
console.log('sent', signature);
const conf = await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
if (conf.value.err) throw new Error(`transaction failed: ${JSON.stringify(conf.value.err)}`);
console.log(JSON.stringify({ mint: mint.publicKey.toBase58(), create_signature: signature }));
