import type { MapPayload } from "@/types/contracts";

// Troca por <MapView/> do Dev 3 (@/components/map/MapView) quando existir.
// Este é o único ponto de import do mapa: ajuste apenas BotBubble.
export default function MapPlaceholder({ map }: { map: MapPayload }) {
  return (
    <div className="map-placeholder">
      <p>{map.altText}</p>
      <ol>{map.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
    </div>
  );
}
