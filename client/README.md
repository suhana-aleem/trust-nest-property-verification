# Client - React Frontend

Frontend for the academic prototype. Integrates with:
- Backend API (`server`) on port `5000`
- Socket.io collaboration on port `5000`

## Setup

1. Open terminal:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create env:
```bash
cp .env.example .env
```

Windows PowerShell:
```powershell
copy .env.example .env
```

4. Run:
```bash
npm run dev
```

App opens on:
- `http://localhost:3000`

## Pages Included

- `/login`
- `/register`
- `/dashboard`
- `/documents/:id`
- `/documents/:id/editor`

## Supported Flows

1. Register/Login with JWT
2. Upload document
3. View document status lifecycle
4. Trigger AI verification
5. Register/verify blockchain hash
6. Lock document
7. Real-time collaborative editing via Socket.io
