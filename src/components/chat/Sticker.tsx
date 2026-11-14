import type { BotMessage } from "@/types/contracts";

const ALT: Record<NonNullable<BotMessage["sticker"]>, string> = {
  padrao: "CapiBot, a capivara mascote, sorrindo",
  inteligente: "CapiBot de óculos, pensativo",
  seguranca: "CapiBot de capacete de segurança",
  feliz: "CapiBot muito feliz",
};

export default function Sticker({ name }: { name: NonNullable<BotMessage["sticker"]> }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="sticker" src={`/stickers/capibot-${name}.svg`} alt={ALT[name]} width={64} height={53} />;
}
