import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin({ email, password });
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-shell">
        <div className="auth-aside">
          <p className="eyebrow">TRUST NEST Control Room</p>
          <h1>Private access for final review, invite control, and document authority.</h1>
          <p className="auth-copy">
            Admin credentials are fixed. Registrar accounts must be created through invite-only
            registration.
          </p>
          <div className="auth-points">
            <span>Admin final authenticity</span>
            <span>Invite-only onboarding</span>
            <span>Registrar agreement finalization</span>
          </div>
        </div>
        <form className="card auth-card" onSubmit={submit}>
          <p className="eyebrow">Admin access</p>
          <h2>Admin Login</h2>
          <input
            type="email"
            placeholder="Admin or staff email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" disabled={loading}>
            {loading ? "Please wait..." : "Enter Admin Panel"}
          </button>
          <p className="auth-switch">
            Invite code holder? <Link to="/admin/invite-register">Complete invite registration</Link>
          </p>
          <p className="auth-switch">
            Back to user access? <Link to="/login">User login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default AdminLoginPage;
