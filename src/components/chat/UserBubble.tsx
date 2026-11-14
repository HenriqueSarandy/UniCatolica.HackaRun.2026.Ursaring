export default function UserBubble({ text }: { text: string }) {
  return (
    <div className="row user">
      <div className="bubble user"><p>{text}</p></div>
    </div>
  );
}
