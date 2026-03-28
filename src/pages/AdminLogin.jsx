import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function decodeJwtPayload(token) {
    try {
      const parts = String(token).split(".");
      if (parts.length < 2) return null;
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = payloadBase64.padEnd(
        payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
        "="
      );
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // If the admin already has a non-expired JWT, avoid forcing re-login.
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const payload = decodeJwtPayload(token);
    const expMs = payload?.exp ? payload.exp * 1000 : null;

    // If token has no exp claim (unexpected), don't redirect to be safe.
    if (!expMs) return;

    if (expMs > Date.now()) {
      navigate("/admin/quizzes", { replace: true });
    } else {
      localStorage.removeItem("adminToken");
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/admin/auth/login", { email, password });
      localStorage.setItem("adminToken", res.data.token);
      navigate("/admin/quizzes");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="card narrow">
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="primary">
          Login
        </button>
      </form>
      <div className="form-hint" style={{ marginTop: 12 }}>
        New here?{" "}
        <button
          type="button"
          className="link-button"
          onClick={() => navigate("/admin/signup")}
        >
          Create admin account
        </button>
      </div>
    </div>
  );
}

