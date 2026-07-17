import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function InviteRegisterPage() {
  const navigate = useNavigate();
  const { inviteRegister } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    inviteCode: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await inviteRegister(form);
      const role = result?.user?.role;
      navigate(["Admin", "Registrar"].includes(role) ? "/admin/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invite registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-shell">
        <div className="auth-aside">
          <p className="eyebrow">Invite-only registration</p>
          <h1>Registrar access is issued only by admin-generated invite code.</h1>
          <p className="auth-copy">
            Use the invite exactly as issued. The system assigns the Registrar role from the code
            and blocks public signup for this back-office account.
          </p>
        </div>
        <form className="card auth-card" onSubmit={submit}>
          <p className="eyebrow">Back-office onboarding</p>
          <h2>Invite Register</h2>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
          <input
            placeholder="Invite Code"
            value={form.inviteCode}
            onChange={(e) => setForm((prev) => ({ ...prev, inviteCode: e.target.value }))}
            required
          />
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" disabled={loading}>
            {loading ? "Please wait..." : "Create Back-office Account"}
          </button>
          <p className="auth-switch">
            Already approved? <Link to="/admin/login">Admin login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default InviteRegisterPage;
