import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "../globals.css";

const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CapiBot — Capim Dourado Shopping",
  description: "Assistente do Capim Dourado Shopping: mapas, lojas e ajuda.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={atkinson.variable}>
      <body>{children}</body>
    </html>
  );
}
