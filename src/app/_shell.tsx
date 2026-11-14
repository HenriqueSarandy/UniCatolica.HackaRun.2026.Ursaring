import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

/** Casca html/body compartilhada por /painel e /faq (não há root layout global). */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={atkinson.variable}>
      <body>{children}</body>
    </html>
  );
}
