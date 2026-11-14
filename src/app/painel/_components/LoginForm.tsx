"use client";

import { useState } from "react";

export function LoginForm({ onLogged }: { onLogged: (name: string) => void }) {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("capibot_staff_name") ?? ""; } catch { return ""; }
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/panel/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const n = name.trim();
        try { localStorage.setItem("capibot_staff_name", n); } catch { /* ignora */ }
        onLogged(n);
      } else if (res.status === 429) setError("Muitas tentativas. Aguarde um minuto.");
      else setError("Senha incorreta.");
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pn-login">
      <h1>Painel da equipe</h1>
      <form onSubmit={submit}>
        <label>
          Seu nome
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p role="alert" className="pn-error">{error}</p>}
        <button className="btn" type="submit" disabled={busy || !name.trim()}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
