import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import { getDocumentsApi } from "../api/documentApi";
import { generateInviteApi, getAdminUsersApi, getInviteCodesApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

function AdminDashboardPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteRole, setInviteRole] = useState("LegalOfficer");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const suspiciousCount = documents.filter(
    (doc) => Number(doc.aiAnalysis?.forgeryProbability || 0) >= 0.5
  ).length;
  const blockchainCount = documents.filter(
    (doc) => doc.status === "Blockchain Registered" || doc.status === "Locked"
  ).length;
  const lockedCount = documents.filter((doc) => doc.status === "Locked").length;
  const aiVerifiedCount = documents.filter((doc) => doc.status === "AI Verified").length;

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

  return (
    <>
      <Navbar />
      <main className="container">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Admin Panel</p>
            <h1 className="hero-title">Review authenticity, issue invites, and govern final trust.</h1>
            <p className="hero-copy">
              Admin, legal, and registrar actions are separated here so the final decision chain
              stays auditable and controlled.
            </p>
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

        {user.role === "Admin" ? (
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Invite Management</p>
                <h3>Generate Staff Access Codes</h3>
              </div>
            </div>
            <div className="inline-actions">
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="LegalOfficer">Legal Officer</option>
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
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.title}</td>
                  <td>{doc.uploadedBy?.name || "Unknown"}</td>
                  <td><StatusBadge status={doc.status} /></td>
                  <td>{doc.aiAnalysis?.forgeryProbability ?? "N/A"}</td>
                  <td><Link to={`/documents/${doc._id}`}>Review</Link></td>
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
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
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
