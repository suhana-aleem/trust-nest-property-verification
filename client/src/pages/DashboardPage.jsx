import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import UploadForm from "../components/UploadForm";
import StatusBadge from "../components/StatusBadge";
import { getDocumentsApi, uploadDocumentApi } from "../api/documentApi";

function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [error, setError] = useState("");

  const lockedCount = documents.filter((doc) => doc.status === "Locked").length;
  const aiVerifiedCount = documents.filter((doc) => doc.status === "AI Verified").length;
  const blockchainCount = documents.filter(
    (doc) => doc.status === "Blockchain Registered" || doc.status === "Locked"
  ).length;

  const loadDocuments = async () => {
    try {
      const data = await getDocumentsApi();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load documents");
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

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

  return (
    <>
      <Navbar />
      <main className="container">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Operations Board</p>
            <h1 className="hero-brand">TRUST NEST</h1>
            <p className="hero-tagline">Proof for Every Property, Trust in Every Transaction.</p>
            <p className="hero-copy">
              Track upload, review, AI verification, registrar approval, blockchain registration,
              and final lock state from one verification desk.
            </p>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Total Docs</span>
              <strong>{documents.length}</strong>
            </article>
            <article className="stat-card">
              <span>AI Verified</span>
              <strong>{aiVerifiedCount}</strong>
            </article>
            <article className="stat-card">
              <span>On Chain</span>
              <strong>{blockchainCount}</strong>
            </article>
            <article className="stat-card">
              <span>Locked</span>
              <strong>{lockedCount}</strong>
            </article>
          </div>
        </section>
        <UploadForm onSubmit={handleUpload} loading={loadingUpload} />
        {error ? <p className="error">{error}</p> : null}
        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Document Ledger</p>
              <h3>My Documents</h3>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Property ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.title}</td>
                  <td>{doc.propertyId}</td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/documents/${doc._id}`}>Open</Link>
                      <Link to={`/documents/${doc._id}/editor`}>Editor</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

export default DashboardPage;
