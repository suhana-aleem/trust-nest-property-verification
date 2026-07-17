import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import UploadForm from "../components/UploadForm";
import { adminDecisionApi, deleteDocumentApi, getDocumentsApi, uploadDocumentApi } from "../api/documentApi";
import { blockUserApi, generateInviteApi, getAdminUsersApi, getInviteCodesApi, unblockUserApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

function AdminDashboardPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteRole, setInviteRole] = useState("Registrar");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingUpload, setLoadingUpload] = useState(false);

  const load = async () => {
    const [docData, userData, inviteData] = await Promise.all([
      getDocumentsApi(),
      user.role === "Admin" ? getAdminUsersApi() : Promise.resolve({ users: [] }),
      user.role === "Admin" ? getInviteCodesApi() : Promise.resolve({ invites: [] })
    ]);
    setDocuments(docData.documents || []);
    setUsers(userData.users || []);
    setInvites(inviteData.invites || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || "Failed to load admin dashboard"));
  }, []);

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
    }
  }, [location.state]);

  const suspiciousCount = documents.filter(
    (doc) => Number(doc.aiAnalysis?.forgeryProbability || 0) >= 0.5
  ).length;
  const blockchainCount = documents.filter(
    (doc) => doc.status === "Blockchain Registered" || doc.status === "Locked"
  ).length;
  const lockedCount = documents.filter((doc) => doc.status === "Locked").length;
  const aiVerifiedCount = documents.filter((doc) => doc.status === "AI Verified").length;
  const roleViews = {
    Admin: {
      eyebrow: "Admin Panel",
      title: "Review authenticity, issue invites, and approve final trust.",
      copy:
        "Admin reviews AI results, requests corrections when needed, approves or rejects documents, manages registrar onboarding, blocks abusive users, and removes spam documents before blockchain finalization.",
      actions: [
        "Review AI results and approve or reject authenticity.",
        "Generate invite codes for Registrar access.",
        "Open any document to take the final approval decision and remove spam when needed."
      ]
    },
    Registrar: {
      eyebrow: "Registrar Panel",
      title: "Review approved cases, edit final agreements, and complete blockchain registration.",
      copy:
        "Registrar owns the original reference documents, reviews requested modifications, prepares the final agreement, and completes blockchain registration after Admin approval.",
      actions: [
        "Upload original reference documents for future copy verification.",
        "Use Open Editor to prepare the final agreement and review suggestions.",
        "After Admin approval, register blockchain, lock the document, and issue the certificate."
      ]
    }
  };
  const roleMatrix = [
    {
      role: "Admin",
      summary: "Final review, user control, invite generation, document approval, document deletion, and blocking abusive users."
    },
    {
      role: "Registrar",
      summary: "Uploads original records, completes blockchain registration, locks documents, and issues certificates."
    },
    {
      role: "Seller",
      summary: "Uploads submitted copies, participates in review, and creates suggestions."
    },
    {
      role: "Buyer",
      summary: "Uploads submitted copies, participates in review, and creates suggestions."
    }
  ];
  const view = roleViews[user.role] || roleViews.Admin;

  const createInvite = async () => {
    setError("");
    setMessage("");
    try {
      const data = await generateInviteApi({ role: inviteRole });
      setMessage(`Invite created: ${data.invite.code}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create invite");
    }
  };

  const handleUpload = async (payload) => {
    setError("");
    setMessage("");
    setLoadingUpload(true);
    try {
      await uploadDocumentApi(payload);
      setMessage("Original reference document uploaded");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload original document");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleAdminDecision = async (documentId, verdict) => {
    setError("");
    setMessage("");
    try {
      const data = await adminDecisionApi(documentId, { verdict });
      setMessage(data.message || `Document ${verdict.toLowerCase()}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update admin decision");
    }
  };

  const handleDeleteDocument = async (documentId) => {
    setError("");
    setMessage("");
    try {
      const data = await deleteDocumentApi(documentId);
      setMessage(data.message || "Document deleted");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete document");
    }
  };

  const handleBlockUser = async (userId, reason = "") => {
    setError("");
    setMessage("");
    try {
      const data = await blockUserApi(userId, { reason });
      setMessage(data.message || "User blocked");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to block user");
    }
  };

  const handleUnblockUser = async (userId) => {
    setError("");
    setMessage("");
    try {
      const data = await unblockUserApi(userId);
      setMessage(data.message || "User unblocked");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unblock user");
    }
  };

  return (
    <>
      <Navbar />
      <main className="container">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">{view.eyebrow}</p>
            <h1 className="hero-title">{view.title}</h1>
            <p className="hero-copy">{view.copy}</p>
            <div className="role-guide">
              {view.actions.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Total Documents</span>
              <strong>{documents.length}</strong>
            </article>
            <article className="stat-card">
              <span>AI Verified</span>
              <strong>{aiVerifiedCount}</strong>
            </article>
            <article className="stat-card">
              <span>Suspicious</span>
              <strong>{suspiciousCount}</strong>
            </article>
            <article className="stat-card">
              <span>Blockchain / Locked</span>
              <strong>{blockchainCount + lockedCount}</strong>
            </article>
          </div>
        </section>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}

        {user.role === "Registrar" || user.role === "Admin" ? (
          <UploadForm
            onSubmit={handleUpload}
            loading={loadingUpload}
            userRole={user.role}
            originals={[]}
          />
        ) : null}

        {user.role === "Admin" ? (
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Invite Management</p>
                <h3>Generate Registrar Access Codes</h3>
              </div>
            </div>
            <div className="inline-actions">
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="Registrar">Registrar</option>
              </select>
              <button className="btn" type="button" onClick={createInvite}>
                Generate Invite
              </button>
            </div>
            <div className="summary-grid">
              {invites.slice(0, 4).map((invite) => (
                <article className="summary-card" key={invite._id}>
                  <span>{invite.role}</span>
                  <strong>{invite.code}</strong>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {user.role === "Admin" ? (
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Role Matrix</p>
                <h3>System Role Knowledge</h3>
              </div>
            </div>
            <div className="summary-grid">
              {roleMatrix.map((item) => (
                <article className="summary-card" key={item.role}>
                  <span>{item.role}</span>
                  <strong>{item.summary}</strong>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Document Review</p>
              <h3>All Documents</h3>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Uploaded By</th>
                <th>Status</th>
                <th>Forgery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.title}</td>
                  <td>{doc.uploadedBy?.name || "Unknown"}</td>
                  <td><StatusBadge status={doc.status} /></td>
                  <td>{doc.aiAnalysis?.forgeryProbability ?? "N/A"}</td>
                  <td className="table-actions">
                    <Link to={`/documents/${doc._id}`}>Review</Link>
                    {user.role === "Admin" && doc.status === "AI Verified" ? (
                      <button className="text-btn" type="button" onClick={() => handleAdminDecision(doc._id, "Approved")}>
                        Approve
                      </button>
                    ) : null}
                    {user.role === "Admin" && ["AI Verified", "Corrections Requested"].includes(doc.status) ? (
                      <button className="text-btn" type="button" onClick={() => handleAdminDecision(doc._id, "CorrectionsRequested")}>
                        Correct
                      </button>
                    ) : null}
                    {user.role === "Admin" && ["AI Verified", "Corrections Requested"].includes(doc.status) ? (
                      <button className="text-btn danger-text" type="button" onClick={() => handleAdminDecision(doc._id, "Rejected")}>
                        Reject
                      </button>
                    ) : null}
                    {user.role === "Registrar" ? (
                      <Link to={`/documents/${doc._id}/editor`}>Open Editor</Link>
                    ) : null}
                    {user.role === "Admin" && doc.status !== "Locked" ? (
                      <button
                        className="text-btn danger-text"
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this document permanently?")) {
                            handleDeleteDocument(doc._id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {user.role === "Admin" ? (
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">User Management</p>
                <h3>System Users</h3>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Block Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td>{item.isBlocked ? "Blocked" : "Active"}</td>
                    <td>{item.blockReason || "-"}</td>
                    <td className="table-actions">
                      {item.role !== "Admin" && !item.isBlocked ? (
                        <button
                          className="text-btn danger-text"
                          type="button"
                          onClick={() => {
                            const reason = window.prompt("Reason for blocking this user?", "Spam or abusive activity");
                            if (reason !== null) {
                              handleBlockUser(item._id, reason);
                            }
                          }}
                        >
                          Block
                        </button>
                      ) : null}
                      {item.role !== "Admin" && item.isBlocked ? (
                        <button
                          className="text-btn"
                          type="button"
                          onClick={() => handleUnblockUser(item._id)}
                        >
                          Unblock
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>
    </>
  );
}

export default AdminDashboardPage;
