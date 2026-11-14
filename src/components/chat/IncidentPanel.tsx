"use client";

import { useEffect, useRef, useState } from "react";

export interface IncidentData {
  text: string; transcript: string; photo: File | null; category?: string; kind?: string; contact?: string;
}

export const REQUEST_TYPES: { id: string; label: string; category: string; kind: string }[] = [
  { id: "reclamacao", label: "Fazer uma reclamação", category: "reclamacao", kind: "reclamacao" },
  { id: "sugestao", label: "Dar uma sugestão", category: "outro", kind: "sugestao" },
  { id: "carro", label: "Não achei meu carro", category: "carro", kind: "ajuda" },
  { id: "objeto", label: "Perdi um objeto", category: "objeto_perdido", kind: "ajuda" },
  { id: "cadeira", label: "Preciso de cadeira de rodas", category: "cadeira_de_rodas", kind: "ajuda" },
  { id: "banheiro", label: "Problema no banheiro", category: "banheiro", kind: "ajuda" },
  { id: "outro", label: "Outro assunto", category: "outro", kind: "ajuda" },
];

interface Props {
  disabled: boolean;
  onSubmit: (data: IncidentData) => void;
  onCancel?: () => void;
  /** Tela 2: mostra o tipo de pedido e o contato opcional. */
  full?: boolean;
}

// Tipagem mínima da Web Speech API (não está em lib.dom).
interface SpeechRec {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
}

const MAX_PHOTO = 5 * 1024 * 1024;

export default function IncidentPanel({ disabled, onSubmit, onCancel, full }: Props) {
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("reclamacao");
  const [contact, setContact] = useState("");
  const recRef = useRef<SpeechRec | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setCanSpeak(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.stop();
  }, []);

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "pt-BR"; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim().slice(0, 1000);
      setTranscript(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); setMsg("Não consegui ouvir. Escreva no campo de texto."); };
    recRef.current = rec;
    setMsg(""); setListening(true);
    rec.start();
  };

  const pickPhoto = (f: File | null) => {
    if (f && f.size > MAX_PHOTO) { setMsg("A foto passou de 5 MB. Escolha uma menor."); return; }
    setMsg(""); setPhoto(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (!text.trim() && !transcript.trim() && !photo) { setMsg("Conte o que houve por texto, voz ou foto."); return; }
    const t = REQUEST_TYPES.find((r) => r.id === type);
    onSubmit({
      text: text.trim(), transcript: transcript.trim(), photo,
      ...(full && t ? { category: t.category, kind: t.kind } : {}),
      ...(full && contact.trim() ? { contact: contact.trim() } : {}),
    });
  };

  return (
    <form className="incident" onSubmit={submit} aria-label="Chamar a equipe">
      {full && (
        <>
          <label htmlFor="inc-type">Qual é o assunto?</label>
          <select id="inc-type" value={type} onChange={(e) => setType(e.target.value)}>
            {REQUEST_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </>
      )}
      <label htmlFor="inc-text">O que aconteceu?</label>
      <textarea id="inc-text" value={text} maxLength={1000} rows={3}
        onChange={(e) => setText(e.target.value)} placeholder="Ex.: perdi meu carro no estacionamento" />

      {transcript && (
        <p className="incident-transcript">
          <strong>Entendi pela voz:</strong> {transcript}{" "}
          <button type="button" className="btn" onClick={() => setTranscript("")}>Apagar</button>
        </p>
      )}
      {photo && <p>Foto anexada: {photo.name} <button type="button" className="btn" onClick={() => setPhoto(null)}>Remover</button></p>}

      <div className="incident-actions">
        {canSpeak && (
          <button type="button" className="btn" onClick={toggleMic} aria-pressed={listening}>
            {listening ? "Parar de gravar" : "🎤 Falar"}
          </button>
        )}
        <label className="btn incident-photo">
          📷 Foto
          <input type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      {full && (
        <>
          <label htmlFor="inc-contact">Contato para retorno (opcional)</label>
          <input id="inc-contact" value={contact} maxLength={120} autoComplete="off"
            onChange={(e) => setContact(e.target.value)} placeholder="Telefone ou e-mail" />
          <p className="incident-lgpd">Usamos o contato só para responder este pedido e o apagamos depois.</p>
        </>
      )}
      <p className="incident-lgpd">Evite fotografar rostos de outras pessoas. A foto é vista só pela equipe e apagada depois do atendimento.</p>
      {msg && <p role="alert">{msg}</p>}

      <div className="incident-actions">
        <button type="submit" className="btn" disabled={disabled}>{full ? "Enviar pedido" : "Chamar a equipe"}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}
