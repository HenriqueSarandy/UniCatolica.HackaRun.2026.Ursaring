"use client";

import { useState } from "react";

// Etapa 3 adiciona microfone; Etapa 4 troca por StoreAutocomplete quando suggestInput === "loja".
export default function Composer({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  return (
    <form className="composer" onSubmit={submit}>
      <input
        type="text" value={text} onChange={(e) => setText(e.target.value)}
        aria-label="Escreva sua mensagem" placeholder="Escreva aqui" autoComplete="off"
      />
      <button type="submit" className="btn" disabled={disabled}>Enviar</button>
    </form>
  );
}
