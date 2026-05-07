# Smart Contract Module (Ethereum Sepolia)

This module stores and verifies SHA-256 document hashes on Ethereum testnet.

## Contract

File: `contracts/DocumentHashRegistry.sol`

Functions:
- `storeHash(bytes32 _hash)` (owner only)
- `verifyHash(bytes32 _hash) returns (bool)`

## Setup

1. Open terminal:
```powershell
cd "D:\my project\smart-contract"
```

2. Install dependencies:
```powershell
npm install
```

3. Create env file:
```powershell
copy .env.example .env
```

4. Fill `.env`:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
```

Notes:
- Use a wallet private key that has Sepolia ETH.
- Keep private key secret.

## Compile

```powershell
npm run compile
```

## Deploy to Sepolia

```powershell
npm run deploy:sepolia
```

Output:
- Deployed address printed in terminal.
- `deployment.json` generated with contract address.

## Connect Backend

Update `server/.env`:

```env
ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETH_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
ETH_CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT_ADDRESS
```

Then restart backend:

```powershell
cd "D:\my project\server"
npm run dev
```

## Test Blockchain APIs (Backend)

1. Register hash on chain:
- `POST /api/documents/:id/register-blockchain`

2. Verify hash on chain:
- `GET /api/documents/:id/verify-blockchain`

3. Lock document after blockchain registration:
- `POST /api/documents/:id/lock`

Expected status progression:
- `AI Verified` -> `Blockchain Registered` -> `Locked`
