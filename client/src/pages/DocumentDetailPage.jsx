import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import SuggestionBoard from "../components/SuggestionBoard";
import WorkflowSummary from "../components/WorkflowSummary";
import {
  analyzeDocumentApi,
  adminDecisionApi,
  approveBuyerApi,
  approveLegalApi,
  approveRegistrarApi,
  approveSellerApi,
  commentSuggestionApi,
  createSuggestionApi,
  getDocumentApi,
  getSuggestionsApi,
  issueCertificateApi,
  lockDocumentApi,
  registerBlockchainApi,
  reviewSuggestionApi,
  verifyBlockchainApi
} from "../api/documentApi";
import { useAuth } from "../context/AuthContext";

function DocumentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [blockchainState, setBlockchainState] = useState(null);

  const canVerify = ["Admin", "LegalOfficer", "Seller", "Buyer"].includes(user?.role);
  const canRegistrar = ["Registrar", "Admin"].includes(user?.role);
  const canAdminReview = ["Admin"].includes(user?.role);

  const loadDocument = async () => {
    const [documentData, suggestionData] = await Promise.all([
      getDocumentApi(id),
      getSuggestionsApi(id)
    ]);
    setDocument(documentData.document);
    setSuggestions(suggestionData.suggestions || []);
  };

  useEffect(() => {
    loadDocument().catch((err) => setError(err.response?.data?.message || "Failed to load"));
  }, [id]);

  const act = async (fn, successLabel) => {
    setError("");
    setActionMsg("");
    try {
      const data = await fn();
      setActionMsg(data.message || successLabel);
      await loadDocument();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    }
  };

  if (!document) return <p className="page-msg">Loading document...</p>;

  return (
    <>
      <Navbar />
      <main className="container">
        <section className="card">
          <div className="detail-head">
            <div>
              <p className="eyebrow">Review File</p>
              <h2>{document.title}</h2>
              <p className="detail-meta">Property ID: {document.propertyId}</p>
              <p className="detail-meta">File: {document.fileName}</p>
            </div>
            <div className="detail-status">
              <span className="detail-label">Current State</span>
              <StatusBadge status={document.status} />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn" disabled={user?.role !== "Seller"} onClick={() => act(() => approveSellerApi(id))}>
              Seller Approve
            </button>
            <button className="btn" disabled={user?.role !== "Buyer"} onClick={() => act(() => approveBuyerApi(id))}>
              Buyer Approve
            </button>
            <button className="btn" disabled={!canVerify} onClick={() => act(() => approveLegalApi(id))}>
              Legal Approve
            </button>
            <button className="btn" disabled={!canVerify} onClick={() => act(() => analyzeDocumentApi(id))}>
              Run AI Verify
            </button>
            <button
              className="btn"
              disabled={!canAdminReview}
              onClick={() => act(() => adminDecisionApi(id, { verdict: "Approved" }), "Admin approved document")}
            >
              Admin Approve
            </button>
            <button
              className="btn btn-secondary"
              disabled={!canAdminReview}
              onClick={() => act(() => adminDecisionApi(id, { verdict: "Rejected" }), "Admin rejected document")}
            >
              Admin Reject
            </button>
            <button
              className="btn"
              disabled={!canRegistrar}
              onClick={() => act(() => approveRegistrarApi(id), "Registrar approval done")}
            >
              Registrar Approve
            </button>
            <button
              className="btn"
              disabled={!canRegistrar}
              onClick={() => act(() => registerBlockchainApi(id), "Registered on blockchain")}
            >
              Register Blockchain
            </button>
            <button
              className="btn"
              disabled={!canRegistrar}
              onClick={() => act(() => lockDocumentApi(id), "Document locked")}
            >
              Lock Document
            </button>
            <button
              className="btn"
              disabled={!canRegistrar}
              onClick={() => act(() => issueCertificateApi(id), "Certificate issued")}
            >
              Issue Certificate
            </button>
            <button
              className="btn"
              onClick={async () => {
                setError("");
                setActionMsg("");
                try {
                  const data = await verifyBlockchainApi(id);
                  setBlockchainState(Boolean(data.existsOnChain));
                  setActionMsg(`Hash exists on chain: ${data.existsOnChain}`);
                } catch (err) {
                  setError(err.response?.data?.message || "Verification failed");
                }
              }}
            >
              Verify Blockchain
            </button>
          </div>
          {actionMsg ? <p className="success">{actionMsg}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Machine Review</p>
              <h3>AI Analysis</h3>
            </div>
          </div>
          <pre className="code">
            {JSON.stringify(document.aiAnalysis || {}, null, 2)}
          </pre>
        </section>

        <WorkflowSummary document={document} blockchainState={blockchainState} />

        <SuggestionBoard
          user={user}
          suggestions={suggestions}
          disabled={document.isLocked}
          onCreateSuggestion={async (payload) => {
            await createSuggestionApi(id, payload);
            await loadDocument();
          }}
          onReviewSuggestion={async (suggestionId, payload) => {
            await reviewSuggestionApi(id, suggestionId, payload);
            await loadDocument();
          }}
          onCommentSuggestion={async (suggestionId, payload) => {
            await commentSuggestionApi(id, suggestionId, payload);
            await loadDocument();
          }}
        />
      </main>
    </>
  );
}

export default DocumentDetailPage;
