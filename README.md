# sites.xyz v1

Static ENS site builder for plain HTML, CSS, JS, and assets.

This app lets a user:

- connect a wallet with `wagmi` + Family `ConnectKit`
- load owned ENS names into a dropdown
- create or import a static site folder
- preview the folder in-browser
- upload the folder to IPFS
- set the ENS `contenthash` to the uploaded CID

The product is intentionally narrow:

- supported: static folders with `index.html` and relative assets
- not supported: React/Vite/Next source projects, build steps, server code

## Stack

- Next.js App Router
- React 18
- wagmi
- ConnectKit
- Pinata upload API
- ENS contenthash writes via the public resolver

`ConnectKit` currently supports React 17/18, so this project is pinned to a React 18-compatible Next.js stack.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_MAINNET_RPC_URL=
PINATA_JWT=
PINATA_GATEWAY=
ENS_SUBGRAPH_URL=
```

Notes:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is required for wallet connections.
- `PINATA_JWT` is required to publish to IPFS.
- `PINATA_GATEWAY` is optional but recommended for nicer returned gateway links.
- `ENS_SUBGRAPH_URL` is optional, but it is what enables enumerating owned ENS names into the dropdown.
- Without `ENS_SUBGRAPH_URL`, the app falls back to the wallet's onchain primary ENS name only.
- `NEXT_PUBLIC_MAINNET_RPC_URL` is optional; the app falls back to the chain default transport.

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Verification

```bash
npm run lint
npm run build
```

Both commands pass on the current codebase.
