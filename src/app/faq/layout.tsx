import type { Metadata, Viewport } from "next";
import { Shell } from "../_shell";

export const metadata: Metadata = {
  title: "Perguntas frequentes — CapiBot",
  description: "Horários, estacionamento, Wi-Fi, eventos e dúvidas comuns do shopping.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
