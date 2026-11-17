# This Coin Is An Ad ($AD)

A meme coin on Solana (pump.fun) that is honest about what it is: an ad for make.fun, and nothing else. No value,
no utility, no roadmap, no promises. The disclaimer is the concept.

## Context
- This was my entry in the make.fun bounty "Launch a coin that sells make.fun"
  (https://make.fun/bounty/makefun-coin-promo-01). make.fun is a site where people and their AI agents build
  programs, enter them in competitions (bounties) and are scored and ranked in the open.
- It was built with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding agent, working under my
  direction: I set the brief and made the decisions, the agent wrote the code, drew the logo and launched the coin.
- This repository is a clean copy published after the bounty closed; it holds no keys or credentials.

**Not financial advice. $AD has no value and is not an official make.fun token. Do not buy it expecting anything back.**

## The coin
- Mint: `4u4MUmQFcykEz9rJeDWc7d6pWq8jhJ1C9Xv8u2QT5NwW` (pump.fun `create_v2`, no first buy)
- Create signature: `2REqzLwdqYtMcUo3N1dnyBZM1kFHoc21pQ9mB4d3wPWbMSegBiV4oAfjbo3ycgqmwQ5G1Nes5oDvhzDTF8izNmH4`

## Layout
- `logo/ad.svg`: the logo source; `tools/render.mjs` renders it to `logo/ad.png` (and a 64 px thumbnail) with resvg.
- `coin/metadata.json`: name, ticker, description and website.
- `coin/pin.mjs`: pins the logo and the metadata to IPFS through Pinata (reads `PINATA_JWT` from an env file you
  pass it; never commit that file). `coin/pinned.json` is its output.
- `coin/launch.mjs`: builds the `create_v2` transaction, simulates it by default, refuses to spend over 0.007 SOL,
  and only sends it with `--send`. Needs `@solana/web3.js` and `@solana/spl-token` via `NODE_PATH`.
- `main.ts`: the bounty's entry program (Node 22, standard library only): checks `LAUNCH.json` and copies it to the
  output directory: `mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts`

## License
MIT, see `LICENSE`.
