import Link from "next/link";
import { loadKnowledgeBase } from "@/server/maps/service";
import "./faq.css";

export default function FaqPage() {
  const kb = loadKnowledgeBase();
  const { horario, estacionamento, wifi } = kb.shopping;

  return (
    <main className="faq">
      <h1>Perguntas frequentes</h1>

      <section>
        <h2>Horários</h2>
        <details><summary>Lojas</summary><p>{horario.lojas}</p></details>
        <details><summary>Alimentação</summary><p>{horario.alimentacao}</p></details>
        <details><summary>Cinema</summary><p>{horario.cinema}</p></details>
      </section>

      <section>
        <h2>Estacionamento e Wi‑Fi</h2>
        <details><summary>Estacionamento</summary><p>{estacionamento}</p></details>
        <details><summary>Wi‑Fi</summary><p>{wifi}</p></details>
      </section>

      <section>
        <h2>O que fazer se…</h2>
        {kb.orientacoes.filter((o) => o.passos.length > 0).map((o) => (
          <details key={o.id}>
            <summary>{o.titulo}</summary>
            <p>{o.texto}</p>
            <ol>{o.passos.map((p) => <li key={p}>{p}</li>)}</ol>
          </details>
        ))}
      </section>

      <section>
        <h2>Eventos</h2>
        {kb.eventos.map((e) => (
          <details key={e.nome}>
            <summary>{e.nome}</summary>
            <p>{e.quando} — {e.onde}</p>
          </details>
        ))}
      </section>

      <section>
        <h2>Dúvidas comuns</h2>
        {kb.faq.map((f) => (
          <details key={f.pergunta}>
            <summary>{f.pergunta}</summary>
            <p>{f.resposta}</p>
          </details>
        ))}
      </section>

      <footer>
        <Link className="btn" href="/">Conversar com o CapiBot</Link>
        <Link className="btn faq-alt" href="/">Falar com uma pessoa</Link>
        <Link className="btn faq-alt" href="/atendimento">Reclamações e serviços</Link>
      </footer>
    </main>
  );
}
