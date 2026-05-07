# Viva Summary

## Project Title
Secure Real-Time Collaborative Property Document Verifier using AI and Blockchain

## 1. Problem Statement
Property document verification is often manual, slow, and vulnerable to forgery/tampering. Traditional systems also lack transparent, immutable proof of verification and edit history.

## 2. Proposed Solution
A full-stack system that:
- allows secure role-based access to users,
- verifies document authenticity using AI,
- enables collaborative real-time document review,
- stores final document hash on blockchain for immutability.

## 3. Objectives Achieved
- Implemented JWT-based authentication and RBAC.
- Built secure document upload and status lifecycle.
- Integrated AI for OCR, basic forgery checks, and signature scoring.
- Deployed Ethereum smart contract for hash storage/verification.
- Added Socket.io collaboration with version and audit history.

## 4. Architecture Overview
- `client` (React): user interface and workflows
- `server` (Node/Express): API, auth, business logic, socket server
- `ai-module` (Flask): AI analysis endpoint (`/analyze-document`)
- `smart-contract` (Solidity/Hardhat): on-chain hash registry
- `MongoDB Atlas`: metadata, users, versions, blockchain records, audit logs

## 5. Security Mechanisms
- Password hashing (`bcrypt`)
- JWT authentication middleware
- Role-based authorization middleware
- File type validation for uploads
- Input sanitization and request validation
- Immutable-style audit logging

## 6. Key Workflow Demonstration
1. Seller uploads property document.
2. Admin/LegalOfficer runs AI verification.
3. AI returns OCR text, forgery probability, tampered regions.
4. System computes SHA-256 hash of finalized document.
5. Hash is stored on Sepolia using smart contract.
6. Hash verification confirms tamper resistance.
7. Document is locked to prevent further edits.

## 7. Outputs Observed
- Document status updates:
  - `Uploaded`
  - `AI Verified`
  - `Blockchain Registered`
  - `Locked`
- Blockchain response includes transaction hash and block number.
- OCR extracted readable legal text from uploaded test document.

## 8. Limitations
- Signature model currently uses basic prototype training setup.
- Copy-move detection is heuristic and not forensic-grade.
- Collaborative editor uses simplified OT logic.

## 9. Future Enhancements
- Train model with larger real signature datasets.
- Add field-level legal clause consistency engine.
- Use advanced CRDT/OT for robust collaboration.
- Add alerting/dashboard and production deployment pipeline.

## 10. Conclusion
The prototype demonstrates a practical and secure approach to property document verification by combining AI analysis, real-time collaboration, and blockchain immutability. It meets the core academic objectives and provides a strong base for further research and real-world scaling.
