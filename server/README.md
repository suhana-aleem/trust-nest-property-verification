# Backend - TRUST NEST

This folder contains the Node.js + Express API for document verification, approvals, AI orchestration, and blockchain registration.

## 1. Features Covered

- JWT authentication (`register`, `login`, `me`)
- Role-based authorization (`Admin`, `LegalOfficer`, `Buyer`, `Seller`, `Registrar`)
- Secure document upload (PDF/JPG/PNG) with metadata in MongoDB
- Document lifecycle states:
  - `Uploaded`
  - `AI Verified`
  - `Blockchain Registered`
  - `Locked`
- Real-time collaborative editing using Socket.io with simple OT
- Version history and immutable audit logging
- AI module integration (`/analyze-document` via Flask API)
- Blockchain integration (Ethereum smart contract methods `storeHash` and `verifyHash`)
- Production hardening:
  - environment validation
  - rate limiting
  - request ID tracing
  - health/readiness probes
  - graceful shutdown
- Storage abstraction:
  - upload pipeline no longer depends directly on `server/uploads`
  - current adapter is local storage
  - storage service now supports S3-compatible backends

## 2. Folder Structure

```text
server/
  src/
    config/
    controllers/
    middlewares/
    models/
    routes/
    services/
    sockets/
    utils/
    validators/
    app.js
    server.js
  uploads/
  .env.example
  package.json
```

## 3. Setup

1. Install dependencies:

```bash
cd server
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update `.env` values:
- `MONGODB_URI` (MongoDB Atlas connection string)
- `JWT_SECRET`
- `AI_API_URL` (Flask service URL)
- `ETH_RPC_URL`, `ETH_PRIVATE_KEY`, `ETH_CONTRACT_ADDRESS`
- `STORAGE_PROVIDER` (`local` by default)

For no-cost S3-style storage during development:
- run `docker compose -f ..\\docker-compose.minio.yml up -d`
- set:
  - `STORAGE_PROVIDER=s3`
  - `STORAGE_BUCKET=trust-nest-documents`
  - `STORAGE_ENDPOINT=http://127.0.0.1:9000`
  - `STORAGE_ACCESS_KEY_ID=minioadmin`
  - `STORAGE_SECRET_ACCESS_KEY=minioadmin`
  - `STORAGE_FORCE_PATH_STYLE=true`

4. Start development server:

```bash
npm run dev
```

## 5. Run automated tests

```bash
npm test
```

Current coverage focus:
- authentication flows
- role restrictions
- guarded document workflow from upload through lock

For a production-style run:

```bash
npm start
```

Containerized:

```bash
docker build -t trust-nest-server .
docker run --env-file .env -p 5000:5000 trust-nest-server
```

## 6. API Endpoints (Core)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/admin/login`
- `POST /api/auth/admin/invite-register`
- `GET /api/auth/me`

### Documents
- `POST /api/documents/upload` (multipart field: `document`)
- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents/:id/participants`
- `GET /api/documents/:id/versions`
- `POST /api/documents/:id/analyze-ai`
- `POST /api/documents/:id/admin-decision`
- `POST /api/documents/:id/register-blockchain`
- `GET /api/documents/:id/verify-blockchain`
- `POST /api/documents/:id/lock`
- `POST /api/documents/:id/issue-certificate`

### Audit
- `GET /api/audit-logs`

## 7. Socket.io Events

Client must connect with JWT:

```js
io("http://localhost:5000", {
  auth: { token: "<jwt_token>" }
});
```

Events:
- `join-document` `{ documentId }`
- `document-state` `{ documentId, content, version }`
- `send-operation` `{ documentId, operation, baseVersion }`
- `receive-operation` broadcast with updated content/version/editor/timestamp
- `leave-document` `{ documentId }`

Operation format:

```json
{ "type": "insert", "position": 10, "text": "new text" }
```

or

```json
{ "type": "delete", "position": 5, "length": 3 }
```

## 8. Health Endpoints

- `GET /api/health`
- `GET /api/ready`

## 9. Notes for Academic Demo

- Keep one `Seller` as document uploader.
- Add `Buyer` / `LegalOfficer` as participants.
- Perform live edits from two clients to demonstrate collaboration.
- Run AI verification, then blockchain registration, then lock document.
- Use audit logs to explain traceability and tamper resistance.
