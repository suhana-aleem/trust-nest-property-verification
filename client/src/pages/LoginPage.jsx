import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-shell">
        <div className="auth-aside">
          <div className="auth-brand-row">
            <p className="auth-brand">TRUST NEST</p>
            <h1 className="auth-tagline">- &ldquo;Proof for Every Property, Trust in Every Transaction.&rdquo;</h1>
          </div>
          <p className="auth-copy auth-copy-centered">
            [A Real-Time Collaborative Property Document Editor and Verifier]
          </p>
          <div className="auth-points">
            <span>Suggestion-based review</span>
            <span>Forgery analysis</span>
            <span>Immutable finalization</span>
          </div>
        </div>
        <form className="card auth-card" onSubmit={submit}>
          <p className="eyebrow">Welcome back</p>
          <h2>Login</h2>
          <input
            type="email"
            placeholder="Email"
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
            {loading ? "Please wait..." : "Enter Workspace"}
          </button>
          <p className="auth-switch">
            No account? <Link to="/register">Create one</Link>
          </p>
          <p className="auth-switch">
            Staff access? <Link to="/admin/login">Admin panel login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default LoginPage;
