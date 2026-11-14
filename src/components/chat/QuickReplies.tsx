import type { QuickReply } from "@/types/contracts";

interface Props {
  items: QuickReply[];
  active: boolean;
  onPick: (q: QuickReply) => void;
}

export default function QuickReplies({ items, active, onPick }: Props) {
  return (
    <div className="quick">
      {items.map((q) => (
        <button
          key={q.id} type="button" className="btn" data-quick
          aria-disabled={!active}
          onClick={() => { if (active) onPick(q); }}
        >
          {q.label}
        </button>
      ))}
    </div>
  );
}
