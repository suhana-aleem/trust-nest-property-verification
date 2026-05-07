# TRUST NEST

AI & Blockchain-Based Property Document Verification System with a production-hardened prototype architecture.

Full-stack platform with:
- React frontend (`client`)
- Node.js + Express backend (`server`)
- Python Flask AI module (`ai-module`)
- Solidity smart contract + Hardhat deployment (`smart-contract`)

## 1. Project Structure

```text
my project/
  client/
  server/
  ai-module/
  smart-contract/
```

## 2. Tech Stack

- Frontend: React.js + Vite
- Backend: Node.js + Express + Socket.io
- Database: MongoDB Atlas
- AI: Python Flask + TensorFlow/Keras + OpenCV + Tesseract
- Blockchain: Solidity + Hardhat + Sepolia
- Security: JWT + RBAC + bcrypt + input/file validation
- Ops hardening: rate limiting, environment validation, readiness checks, graceful shutdown, Dockerized services

## 3. Core Implemented Features

- User authentication and authorization
  - Register/Login
  - JWT token auth
  - Roles: `Admin`, `LegalOfficer`, `Buyer`, `Seller`, `Registrar`
- Document management
  - Upload PDF/JPG/PNG
  - Status lifecycle: `Uploaded` -> `AI Verified` -> `Blockchain Registered` -> `Locked`
- AI verification
  - Signature score + forgery probability
  - OCR text extraction
  - Copy-move tamper region detection
- Blockchain verification
  - SHA-256 hash generation
  - Store hash on Sepolia
  - Verify hash existence
- Real-time collaboration
  - Socket.io editor
  - Basic OT operations (`insert`/`delete`)
  - Version history and audit logs

## 4. Prerequisites

- Node.js 18+
- Python 3.10+ (project tested with newer versions too)
- MongoDB Atlas cluster
- Tesseract OCR installed (Windows path usually `C:\Program Files\Tesseract-OCR\tesseract.exe`)
- Sepolia wallet with test ETH
- Infura or Alchemy RPC URL

## 5. Environment Setup

### 5.1 Backend (`server/.env`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=<mongodb_atlas_uri>
JWT_SECRET=<strong_secret>
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:3000,http://localhost:4173
ADMIN_EMAIL=admin@system.com
ADMIN_PASSWORD=<strong_admin_password>
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=300
AI_API_URL=http://127.0.0.1:5001
ETH_RPC_URL=<sepolia_rpc_url>
ETH_PRIVATE_KEY=<wallet_private_key>
ETH_CONTRACT_ADDRESS=<deployed_contract_address>
STORAGE_PROVIDER=local
```

### 5.2 AI Module (`ai-module/.env`)

```env
FLASK_HOST=0.0.0.0
FLASK_PORT=5001
FLASK_DEBUG=false
MODEL_PATH=models/signature_cnn.h5
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

### 5.3 Smart Contract (`smart-contract/.env`)

```env
SEPOLIA_RPC_URL=<sepolia_rpc_url>
PRIVATE_KEY=<wallet_private_key>
```

### 5.4 Frontend (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 6. Run Order (Important)

### Quick start

From project root:

```powershell
cd "D:\my project"
.\start-all.ps1
```

This opens three terminals and starts:
- backend on `http://localhost:5000`
- AI module on `http://127.0.0.1:5001`
- frontend on `http://localhost:3000`

### Step 1: Start backend

```bash
cd server
npm install
npm run dev
```

### Step 2: Start AI service

```bash
cd ai-module
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m src.app
```

### Step 3: Deploy contract (one-time / when needed)

```bash
cd smart-contract
npm install
npm run compile
npm run deploy:sepolia
```

Copy deployed address to `server/.env` as `ETH_CONTRACT_ADDRESS`.

### Step 4: Start frontend

```bash
cd client
npm install
npm run dev
```

Open: `http://localhost:3000`

## 7. Production-Ready Improvements

Compared to the earlier academic-only version, the project now includes:

- startup-time environment validation for safer deployment
- auth-specific and global API throttling
- request ID tracing in logs and API errors
- health and readiness endpoints:
  - `GET /api/health`
  - `GET /api/ready`
- graceful shutdown behavior for process managers and containers
- Dockerfiles for `server`, `client`, and `ai-module`
- `docker-compose.prod.yml` for multi-service local/prototype deployment

These improvements make the project much easier to discuss as a resume project because they show attention to deployment, operational safety, and backend reliability.

## 8. Storage Architecture

The upload flow now uses a storage abstraction layer instead of binding business logic directly to `server/uploads`.

- current adapter: `local`
- entry point: `server/src/services/storage/storageService.js`
- local implementation: `server/src/services/storage/localStorageService.js`

This keeps local development simple while preparing the codebase for an S3-compatible adapter in a future step.

## 9. Production Deployment

### Option A: Docker Compose

From project root:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- AI service: `http://localhost:5001`

### Option B: Process-based deployment

- Backend: PM2, systemd, or container runtime
- AI module: Gunicorn/Waitress or container runtime
- Frontend: build and serve behind Nginx
- Database: MongoDB Atlas
- Blockchain RPC: Infura or Alchemy

### No-cost object storage with MinIO

If you want S3-style storage locally without paying for AWS:

```bash
docker compose -f docker-compose.minio.yml up -d
```

Then set these in `server/.env`:

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=trust-nest-documents
STORAGE_REGION=us-east-1
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_PUBLIC_BASE_URL=http://127.0.0.1:9000/trust-nest-documents
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
```

MinIO console:
- API: `http://localhost:9000`
- Console UI: `http://localhost:9001`
- default login: `minioadmin` / `minioadmin`

## 10. Demo Flow (For Viva)

1. Register/Login users (`Seller`, `Admin`, `LegalOfficer`)
2. Seller uploads a property document
3. Admin/LegalOfficer runs AI verification
4. Admin/LegalOfficer registers document hash on blockchain
5. Verify hash exists on-chain
6. Lock document
7. Open collaborative editor and show lock behavior

## 11. Main API Endpoints

- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Documents:
  - `POST /api/documents/upload`
  - `POST /api/documents/:id/analyze-ai`
  - `POST /api/documents/:id/register-blockchain`
  - `GET /api/documents/:id/verify-blockchain`
  - `POST /api/documents/:id/lock`
  - `GET /api/documents/:id`
  - `GET /api/documents/:id/versions`
- Audit:
  - `GET /api/audit-logs`

## 12. Current Status

- End-to-end flow is implemented and tested:
  - Upload -> AI verify -> blockchain register -> lock
- Project is ready for academic demonstration and viva with screenshots and transaction proof.
- It is also substantially stronger as a portfolio project because it now includes production-oriented backend hardening and deployable service definitions.

## 13. Resume-Ready Highlights

- Built a multi-service full-stack platform with React, Node.js, Flask AI, MongoDB Atlas, and Ethereum smart contracts
- Implemented role-based approval workflows across Buyer, Seller, Legal Officer, Admin, and Registrar personas
- Integrated OCR, tamper analysis, and blockchain verification into a document authenticity pipeline
- Added production-oriented backend features including rate limiting, readiness probes, request tracing, and environment validation
- Refactored uploads behind a pluggable storage abstraction to prepare for cloud object storage
- Added an S3-compatible adapter that can run against free local MinIO for development
- Containerized the system for repeatable local and prototype deployment
- Added GitHub Actions CI for backend tests, frontend builds, and AI module syntax verification

## 14. Future Scope

- Stronger signature model with larger dataset
- Multi-page PDF OCR + field-level inconsistency highlights
- Better OT/CRDT conflict resolution
- Digital signature integration and certificate-based identity
- CI/CD, centralized monitoring, and managed secret storage
