jest.mock("../src/services/aiService", () => ({
  analyzeDocumentWithAI: jest.fn().mockResolvedValue({
    signature_score: 0.91,
    forgery_probability: 0.19,
    tampered_regions: [],
    extracted_text: "Verified property deed"
  }),
  analyzeDocumentBufferWithAI: jest.fn().mockResolvedValue({
    signature_score: 0.91,
    forgery_probability: 0.19,
    tampered_regions: [],
    extracted_text: "Verified property deed"
  })
}));

jest.mock("../src/services/blockchainService", () => ({
  storeHashOnChain: jest.fn().mockResolvedValue({
    transactionHash: "0xtesthash",
    blockNumber: 123
  }),
  verifyHashOnChain: jest.fn().mockResolvedValue(false)
}));

const request = require("supertest");
const {
  app,
  registerPublicUser,
  createStaffUser,
  loginUser,
  pdfFixture
} = require("./helpers");
const { DOCUMENT_STATUS, USER_ROLES } = require("../src/utils/constants");

describe("Document workflow API", () => {
  test("runs the guarded workflow from upload through lock", async () => {
    await registerPublicUser({
      name: "Seller One",
      email: "seller@example.com",
      role: USER_ROLES.SELLER
    });
    await registerPublicUser({
      name: "Buyer One",
      email: "buyer@example.com",
      role: USER_ROLES.BUYER
    });
    await createStaffUser({
      name: "Legal One",
      email: "legal@example.com",
      role: USER_ROLES.LEGAL_OFFICER
    });
    await createStaffUser({
      name: "Registrar One",
      email: "registrar@example.com",
      role: USER_ROLES.REGISTRAR
    });

    const sellerLogin = await loginUser({ email: "seller@example.com" });
    const buyerLogin = await loginUser({ email: "buyer@example.com" });
    const legalLogin = await loginUser({
      email: "legal@example.com",
      admin: true
    });
    const registrarLogin = await loginUser({
      email: "registrar@example.com",
      admin: true
    });
    const adminLogin = await request(app).post("/api/auth/admin/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });

    const upload = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${sellerLogin.body.token}`)
      .field("title", "Plot Sale Deed")
      .attach("document", pdfFixture(), {
        filename: "sale-deed.pdf",
        contentType: "application/pdf"
      });

    expect(upload.statusCode).toBe(201);
    expect(upload.body.document.propertyId).toMatch(/^PROP-\d{8}-\d{4}$/);
    expect(upload.body.document.status).toBe(DOCUMENT_STATUS.UPLOADED);

    const documentId = upload.body.document._id;

    const addBuyer = await request(app)
      .post(`/api/documents/${documentId}/participants`)
      .set("Authorization", `Bearer ${sellerLogin.body.token}`)
      .send({ userEmail: "buyer@example.com" });

    expect(addBuyer.statusCode).toBe(200);

    const buyerSuggestion = await request(app)
      .post(`/api/documents/${documentId}/suggestions`)
      .set("Authorization", `Bearer ${buyerLogin.body.token}`)
      .send({ suggestionText: "Fix the buyer middle name", context: "Buyer section" });

    expect(buyerSuggestion.statusCode).toBe(201);

    const suggestionId = buyerSuggestion.body.suggestion._id;

    const legalReview = await request(app)
      .post(`/api/documents/${documentId}/suggestions/${suggestionId}/review`)
      .set("Authorization", `Bearer ${legalLogin.body.token}`)
      .send({ status: "Accepted", reviewNote: "Valid change request" });

    expect(legalReview.statusCode).toBe(200);

    const legalApproveTooEarly = await request(app)
      .post(`/api/documents/${documentId}/approve/legal`)
      .set("Authorization", `Bearer ${legalLogin.body.token}`);

    expect(legalApproveTooEarly.statusCode).toBe(400);

    const sellerApprove = await request(app)
      .post(`/api/documents/${documentId}/approve/seller`)
      .set("Authorization", `Bearer ${sellerLogin.body.token}`);
    const buyerApprove = await request(app)
      .post(`/api/documents/${documentId}/approve/buyer`)
      .set("Authorization", `Bearer ${buyerLogin.body.token}`);

    expect(sellerApprove.statusCode).toBe(200);
    expect(buyerApprove.statusCode).toBe(200);

    const legalApprove = await request(app)
      .post(`/api/documents/${documentId}/approve/legal`)
      .set("Authorization", `Bearer ${legalLogin.body.token}`);

    expect(legalApprove.statusCode).toBe(200);

    const aiVerify = await request(app)
      .post(`/api/documents/${documentId}/analyze-ai`)
      .set("Authorization", `Bearer ${sellerLogin.body.token}`);

    expect(aiVerify.statusCode).toBe(200);
    expect(aiVerify.body.result.forgeryProbability).toBe(0.19);

    const adminDecision = await request(app)
      .post(`/api/documents/${documentId}/admin-decision`)
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({ verdict: "Approved", remarks: "Looks genuine" });

    expect(adminDecision.statusCode).toBe(200);
    expect(adminDecision.body.document.status).toBe(DOCUMENT_STATUS.ADMIN_APPROVED);

    const registrarApprove = await request(app)
      .post(`/api/documents/${documentId}/approve/registrar`)
      .set("Authorization", `Bearer ${registrarLogin.body.token}`);

    expect(registrarApprove.statusCode).toBe(200);

    const sellerBlockchainAttempt = await request(app)
      .post(`/api/documents/${documentId}/register-blockchain`)
      .set("Authorization", `Bearer ${sellerLogin.body.token}`);

    expect(sellerBlockchainAttempt.statusCode).toBe(403);

    const blockchainRegister = await request(app)
      .post(`/api/documents/${documentId}/register-blockchain`)
      .set("Authorization", `Bearer ${registrarLogin.body.token}`);

    expect(blockchainRegister.statusCode).toBe(200);
    expect(blockchainRegister.body.blockchainRecord.transactionHash).toBe("0xtesthash");

    const lockAttemptByLegal = await request(app)
      .post(`/api/documents/${documentId}/lock`)
      .set("Authorization", `Bearer ${legalLogin.body.token}`);

    expect(lockAttemptByLegal.statusCode).toBe(403);

    const lockDocument = await request(app)
      .post(`/api/documents/${documentId}/lock`)
      .set("Authorization", `Bearer ${registrarLogin.body.token}`);

    expect(lockDocument.statusCode).toBe(200);
    expect(lockDocument.body.document.status).toBe(DOCUMENT_STATUS.LOCKED);
  });
});
