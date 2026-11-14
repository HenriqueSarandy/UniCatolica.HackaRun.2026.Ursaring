import type { BotMessage, QuickReply } from "@/types/contracts";
import Sticker from "./Sticker";
import QuickReplies from "./QuickReplies";
import MapPlaceholder from "./MapPlaceholder";

interface Props {
  message: BotMessage;
  isLast: boolean;
  onQuickReply: (q: QuickReply) => void;
}

export default function BotBubble({ message, isLast, onQuickReply }: Props) {
  return (
    <div className="row">
      {message.sticker && <Sticker name={message.sticker} />}
      <div className="bubble bot">
        <p>{message.text}</p>
        {message.map && <MapPlaceholder map={message.map} />}
        {message.quickReplies && (
          <QuickReplies items={message.quickReplies} active={isLast} onPick={onQuickReply} />
        )}
      </div>
    </div>
  );
}
