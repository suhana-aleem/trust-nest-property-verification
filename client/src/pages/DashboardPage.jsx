import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import UploadForm from "../components/UploadForm";
import StatusBadge from "../components/StatusBadge";
import VerdictBadge from "../components/VerdictBadge";
import { deleteDocumentApi, getDocumentsApi, getOriginalDocumentsApi, uploadDocumentApi } from "../api/documentApi";
import { useAuth } from "../context/AuthContext";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDocumentVerdict = (doc) => doc.aiAnalysis?.genuineVerdict || doc.latestVerificationReport?.status || "Pending";
const isSuspiciousVerdict = (doc) => ["SUSPICIOUS", "HIGH RISK / FAKE"].includes(getDocumentVerdict(doc));

function DashboardPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [originals, setOriginals] = useState([]);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deletingIds, setDeletingIds] = useState([]);
  const [toast, setToast] = useState(null);

  const isPrivilegedUser = ["Admin", "Registrar"].includes(user?.role);
  const isDeleteBusy = deletingIds.length > 0;

  const canDeleteDocument = (doc) => {
    if (doc.status === "Locked") {
      return false;
    }

    if (isPrivilegedUser) {
      return true;
    }

    return String(doc.uploadedBy?._id) === String(user?._id);
  };

  const verdictCount = {
    genuine: documents.filter((doc) => getDocumentVerdict(doc) === "VERIFIED GENUINE").length,
    suspicious: documents.filter((doc) => getDocumentVerdict(doc) === "SUSPICIOUS").length,
    fake: documents.filter((doc) => getDocumentVerdict(doc) === "HIGH RISK / FAKE").length
  };
  const blockchainCount = documents.filter(
    (doc) => doc.status === "Blockchain Registered" || doc.status === "Locked"
  ).length;

  const suspiciousDocuments = documents.filter((doc) => isSuspiciousVerdict(doc));
  const deletableSuspiciousDocuments = suspiciousDocuments.filter((doc) => canDeleteDocument(doc));

  const loadDocuments = async () => {
    try {
      const [data, originalData] = await Promise.all([getDocumentsApi(), getOriginalDocumentsApi()]);
      setDocuments(data.documents || []);
      setOriginals(originalData.originals || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load documents");
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!deleteDialog) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleteBusy) {
        setDeleteDialog(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteDialog, isDeleteBusy]);

  const handleUpload = async (payload) => {
    setError("");
    setLoadingUpload(true);
    try {
      await uploadDocumentApi(payload);
      await loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleDeleteDocuments = async (documentIds) => {
    const uniqueIds = [...new Set(documentIds)].filter(Boolean);

    if (!uniqueIds.length) {
      return;
    }

    setError("");
    setDeletingIds((prev) => [...new Set([...prev, ...uniqueIds])]);

    let deletedCount = 0;

    try {
      for (const documentId of uniqueIds) {
        await deleteDocumentApi(documentId);
        deletedCount += 1;
        await delay(220);
        setDocuments((prev) => prev.filter((doc) => doc._id !== documentId));
        setDeletingIds((prev) => prev.filter((id) => id !== documentId));
      }

      setToast({
        type: "success",
        message:
          deletedCount === 1
            ? "Document verification record deleted successfully."
            : `${deletedCount} document verification records deleted successfully.`
      });
    } catch (err) {
      setDeletingIds([]);
      setError(err.response?.data?.message || "Failed to delete document");
    }
  };

  const openDeleteDialog = (documentId) => {
    setDeleteDialog({
      kind: "single",
      documentIds: [documentId]
    });
  };

  const openBulkDeleteDialog = () => {
    if (!deletableSuspiciousDocuments.length || isDeleteBusy) {
      return;
    }

    setDeleteDialog({
      kind: "bulk",
      documentIds: deletableSuspiciousDocuments.map((doc) => doc._id)
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog) {
      return;
    }

    const { documentIds } = deleteDialog;
    setDeleteDialog(null);
    await handleDeleteDocuments(documentIds);
  };

  return (
    <>
      <Navbar />
      {toast ? (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      <main className="container">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Operations Board</p>
            <h1 className="hero-brand">TRUST NEST</h1>
            <p className="hero-tagline">Proof for Every Property, Trust in Every Transaction.</p>
            <div className="verdict-legend">
              <article className="summary-card verdict-card">
                <span>Green</span>
                <strong>Certified Genuine</strong>
              </article>
              <article className="summary-card verdict-card">
                <span>Orange</span>
                <strong>Suspicious</strong>
              </article>
              <article className="summary-card verdict-card">
                <span>Red</span>
                <strong>High Risk / Fake</strong>
              </article>
            </div>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Total Docs</span>
              <strong>{documents.length}</strong>
            </article>
            <article className="stat-card">
              <span>Genuine</span>
              <strong>{verdictCount.genuine}</strong>
            </article>
            <article className="stat-card">
              <span>Suspicious</span>
              <strong>{verdictCount.suspicious}</strong>
            </article>
            <article className="stat-card">
              <span>Fake</span>
              <strong>{verdictCount.fake}</strong>
            </article>
            <article className="stat-card">
              <span>On Chain</span>
              <strong>{blockchainCount}</strong>
            </article>
            <article className="stat-card">
              <span>Locked</span>
              <strong>{documents.filter((doc) => doc.status === "Locked").length}</strong>
            </article>
          </div>
        </section>
        <UploadForm
          onSubmit={handleUpload}
          loading={loadingUpload}
          userRole={user?.role}
          originals={originals}
        />
        {error ? <p className="error">{error}</p> : null}
        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Document Ledger</p>
              <h3>My Documents</h3>
            </div>
            <button
              className="btn btn-danger"
              type="button"
              disabled={!deletableSuspiciousDocuments.length || isDeleteBusy}
              onClick={openBulkDeleteDialog}
              title={
                deletableSuspiciousDocuments.length
                  ? "Delete all suspicious documents you can clear"
                  : "No suspicious documents available to clear"
              }
            >
              <span aria-hidden="true">🗑</span>
              <span>Clear All Suspicious Documents ({deletableSuspiciousDocuments.length})</span>
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Property ID</th>
                <th>AI Verdict</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length ? (
                documents.map((doc) => {
                  const verdict = getDocumentVerdict(doc);
                  const isDeleting = deletingIds.includes(doc._id);
                  const canClear = canDeleteDocument(doc);

                  return (
                    <tr key={doc._id} className={isDeleting ? "is-removing" : ""}>
                      <td>{doc.title}</td>
                      <td>{doc.documentType === "Original" ? "Original" : "Copy"}</td>
                      <td>{doc.propertyId}</td>
                      <td>
                        <VerdictBadge verdict={verdict} />
                      </td>
                      <td>
                        <StatusBadge status={doc.status} />
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link to={`/documents/${doc._id}`}>Open</Link>
                          {canClear ? (
                            <>
                              <span className="table-action-separator" aria-hidden="true">
                                |
                              </span>
                              <button
                                className="text-btn danger-text destructive-action"
                                type="button"
                                disabled={isDeleteBusy || isDeleting}
                                onClick={() => openDeleteDialog(doc._id)}
                                title="Delete verification record"
                              >
                                <span aria-hidden="true">🗑</span>
                                <span>{isDeleting ? "Deleting..." : "Clear"}</span>
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="table-empty" colSpan="6">
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>

      {deleteDialog ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!isDeleteBusy) {
              setDeleteDialog(null);
            }
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">{deleteDialog.kind === "bulk" ? "Bulk Delete" : "Confirmation"}</p>
            <h3 id="delete-modal-title">
              {deleteDialog.kind === "bulk" ? "Delete Suspicious Documents" : "Delete Verification Record"}
            </h3>
            <p className="modal-message">
              {deleteDialog.kind === "bulk"
                ? `Are you sure you want to remove these ${deleteDialog.documentIds.length} suspicious document verification records? This action cannot be undone.`
                : "Are you sure you want to remove this document verification record? This action cannot be undone."}
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setDeleteDialog(null)} disabled={isDeleteBusy}>
                Cancel
              </button>
              <button className="btn btn-danger" type="button" onClick={confirmDelete} disabled={isDeleteBusy}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default DashboardPage;
