import type { Metadata, Viewport } from "next";
import { Shell } from "../_shell";
import "./painel.css";

export const metadata: Metadata = {
  title: "CapiBot — Painel",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
