import React from "react";
import { motion } from "motion/react";
import { Play } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { hasFreshCache } from "../utils/videoCache";

interface LoginProps {
  onLogin: (fromCache: boolean) => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

const GUEST_USER = "jexi";
const GUEST_PASS = "pass123";
const GUEST_URL  = "https://jexi.com/";

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ── Special shortcut: jexi / pass123 → open jexi.com ──
    if (username.trim() === GUEST_USER && password === GUEST_PASS) {
      window.open(GUEST_URL, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);

    const cached = hasFreshCache();

    if (cached) {
      /*
       * Cache exists → enter app instantly, auth in background.
       * Token saved to sessionStorage so it's available for save/like
       * calls during this session, but cleared when app is closed.
       */
      onLogin(true);

      axios
        .post(`${API_BASE}/auth/login`, { email: username, password })
        .then((res) => {
          if (res.data?.token) {
            sessionStorage.setItem("token", res.data.token);
          }
        })
        .catch((err) => console.warn("Background auth failed:", err));

      return;
    }

    // No cache → wait for auth before entering
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: username,
        password,
      });
      if (res.status === 200) {
        // Save token to sessionStorage — survives the session, cleared on app close
        if (res.data?.token) {
          sessionStorage.setItem("token", res.data.token);
        }
        onLogin(false);
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid username or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-background p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-md">
        <motion.div
          className="bg-surface/60 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-border-subtle"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-content">
            Jexi
          </h1>
          <p className="text-content-muted text-center mb-8">
            Please login to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content-muted mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Enter username"
                autoComplete="off"
                autoCapitalize="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-muted mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
