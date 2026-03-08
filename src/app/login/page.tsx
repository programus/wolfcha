"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("密码错误 / Wrong password");
        return;
      }

      const from = searchParams.get("from") ?? "/";
      router.replace(from);
    } catch {
      setError("网络错误 / Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="请输入密码 / Enter password"
        autoFocus
        disabled={loading}
        style={{
          borderRadius: "8px",
          border: "1px solid #444",
          background: "#111",
          padding: "10px 12px",
          fontSize: "14px",
          color: "#fff",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <p style={{ textAlign: "center", fontSize: "12px", color: "#f87171", margin: 0 }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        style={{
          borderRadius: "8px",
          background: "#555",
          border: "none",
          padding: "10px",
          fontSize: "14px",
          fontWeight: 500,
          color: "#fff",
          cursor: loading || !password ? "not-allowed" : "pointer",
          opacity: loading || !password ? 0.5 : 1,
          transition: "background 0.15s",
        }}
      >
        {loading ? "···" : "进入 / Enter"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a1a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "320px",
          padding: "32px",
          borderRadius: "16px",
          border: "1px solid #333",
          background: "#222",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <h1
          style={{
            marginBottom: "24px",
            textAlign: "center",
            fontSize: "20px",
            fontWeight: "bold",
            color: "#fff",
          }}
        >
          🐺 Wolfcha
        </h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
