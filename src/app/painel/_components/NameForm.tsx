"use client";

import { useState } from "react";

/** Pergunta só o nome de quem atende (aparece para o visitante: "Marcos … já está cuidando"). Sem senha. */
export function NameForm({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const [name, setName] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    try { localStorage.setItem("capibot_staff_name", n); } catch { /* ignora */ }
    onDone(n);
  }

  return (
    <main className="pn-login">
      <h1>Painel da equipe</h1>
      <form onSubmit={submit}>
        <label>
          Seu nome
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" autoFocus />
        </label>
        <button className="btn" type="submit" disabled={!name.trim()}>Entrar no painel</button>
      </form>
    </main>
  );
}
