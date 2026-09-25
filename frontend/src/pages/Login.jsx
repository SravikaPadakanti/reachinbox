import React, { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store";
import { Google } from "../icons";

export default function Login() {
  const { user, setUser } = useStore();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(
    params.get("error")
      ? "Google sign-in was blocked or cancelled. Please try again or sign in with email."
      : ""
  );

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      return setMsg("Please enter your email ID.");
    }
    if (!password.trim()) {
      return setMsg("Please enter your password.");
    }
    setLoading(true);
    setMsg("");
    try {
      const u = await api.login({ email: email.trim(), password });
      setUser(u);
    } catch (err) {
      setMsg(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Login</h1>

        <button
          className="btn-google"
          type="button"
          onClick={() => (window.location.href = api.googleLoginUrl)}
        >
          <Google /> Login with Google
        </button>

        <div className="divider"><span>or sign in through email</span></div>

        <form onSubmit={onSubmit} className="login-form">
          <input
            className="field"
            type="email"
            placeholder="Email ID"
            aria-label="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {msg && <p className="form-msg" role="alert" style={{ background: "#FEF2F2", padding: "8px 12px", borderRadius: "6px" }}>{msg}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
