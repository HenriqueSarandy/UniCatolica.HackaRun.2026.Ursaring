import type { Metadata, Viewport } from "next";
import { Shell } from "../_shell";

export const metadata: Metadata = {
  title: "Reclamações e serviços — CapiBot",
  description: "Registre uma reclamação, sugestão ou peça ajuda ao Capim Dourado Shopping.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function AtendimentoLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
