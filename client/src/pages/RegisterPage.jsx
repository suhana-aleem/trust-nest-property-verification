import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roles = ["Buyer", "Seller"];

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Seller"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-shell">
        <div className="auth-aside">
          <p className="eyebrow">TRUST NEST Access Provisioning</p>
          <h1>Assign the right authority before a property file enters the trust chain.</h1>
          <p className="auth-copy">
            Each role exposes a different part of the review pipeline: suggestion, moderation,
            legal verification, registrar approval, and final certificate issue.
          </p>
          <div className="auth-points">
            <span>Seller upload</span>
            <span>Buyer suggestion</span>
            <span>Registrar final lock</span>
          </div>
        </div>
        <form className="card auth-card" onSubmit={submit}>
          <p className="eyebrow">New user</p>
          <h2>Register</h2>
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
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" disabled={loading}>
            {loading ? "Please wait..." : "Create Account"}
          </button>
          <p className="auth-switch">
            Already have account? <Link to="/login">Login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default RegisterPage;
