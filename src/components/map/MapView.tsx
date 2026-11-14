"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MapPayload } from "@/types/contracts";
import styles from "./MapView.module.css";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const BUTTON_STEP = 1.5;

interface View { s: number; x: number; y: number }
const HOME: View = { s: 1, x: 0, y: 0 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Mantém o conteúdo cobrindo o quadro: translação entre (tamanho − tamanho·s) e 0. */
function fit(v: View, w: number, h: number): View {
  return { s: v.s, x: clamp(v.x, w - w * v.s, 0), y: clamp(v.y, h - h * v.s, 0) };
}

/** Zoom com ponto fixo (cx, cy), em px relativos ao quadro. */
function zoomAt(v: View, factor: number, cx: number, cy: number, w: number, h: number): View {
  const s = clamp(v.s * factor, MIN_SCALE, MAX_SCALE);
  const r = s / v.s;
  return fit({ s, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }, w, h);
}

function Pill({ x, y, text, below }: { x: number; y: number; text: string; below?: boolean }) {
  const w = text.length * 9 + 20;
  const px = clamp(x - w / 2, 8, 1192 - w);
  const py = below ? y + 22 : y - 22 - 28;
  return (
    <g>
      <rect x={px} y={py} width={w} height={28} rx={14} className={styles.pill} />
      <text x={px + w / 2} y={py + 19} textAnchor="middle" fontSize={16} fontWeight={600} className={styles.pillText}>
        {text}
      </text>
    </g>
  );
}

export default function MapView({ map }: { map: MapPayload }) {
  const titleId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const [view, setView] = useState<View>(HOME);
  const [imgFailed, setImgFailed] = useState(false);

  // Planta é outro arquivo: se falhar, sobra só a descrição em texto.
  useEffect(() => {
    setImgFailed(false);
    const img = new Image();
    img.onerror = () => setImgFailed(true);
    img.src = map.mapSvgUrl;
    return () => { img.onerror = null; };
  }, [map.mapSvgUrl]);

  const size = () => {
    const r = frame.current?.getBoundingClientRect();
    return { w: r?.width ?? 0, h: r?.height ?? 0, left: r?.left ?? 0, top: r?.top ?? 0 };
  };
  const zoomCenter = (factor: number) => {
    const { w, h } = size();
    setView((v) => zoomAt(v, factor, w / 2, h / 2, w, h));
  };

  const local = (e: React.PointerEvent) => {
    const { left, top } = size();
    return { x: e.clientX - left, y: e.clientY - top };
  };
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) pinchDist.current = dist();
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = local(e);
    pointers.current.set(e.pointerId, cur);
    const { w, h } = size();
    if (pointers.current.size === 1) {
      setView((v) => fit({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }, w, h));
    } else if (pointers.current.size === 2 && pinchDist.current > 0) {
      const [a, b] = [...pointers.current.values()];
      const d = dist();
      const factor = d / pinchDist.current;
      pinchDist.current = d;
      setView((v) => zoomAt(v, factor, (a.x + b.x) / 2, (a.y + b.y) / 2, w, h));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinchDist.current = 0;
  };

  const { origin, destination } = map;
  const destBelow = destination.y < 90;
  const originBelow = origin.y < 90;

  return (
    <figure role="group" aria-labelledby={titleId} className={styles.figure}>
      <figcaption id={titleId} className={styles.caption}>Mapa do piso {map.floor}</figcaption>

      {!imgFailed && (
        <>
          <div
            ref={frame}
            className={styles.frame}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div className={styles.layer} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
              <svg viewBox={map.viewBox} role="img" aria-label={map.altText} className={styles.svg}>
                <image href={map.mapSvgUrl} x={0} y={0} width={1200} height={800} />
                <path d={map.routePath} className={styles.routeOutline} />
                <path d={map.routePath} className={styles.route} />
                <circle cx={origin.x} cy={origin.y} r={12} className={styles.origin} />
                <Pill x={origin.x} y={origin.y} text={origin.label} below={originBelow} />
                <circle cx={destination.x} cy={destination.y} r={14} className={styles.dest} />
                <circle cx={destination.x} cy={destination.y} r={5} className={styles.destDot} />
                <Pill x={destination.x} y={destination.y} text={destination.label} below={destBelow} />
              </svg>
            </div>
          </div>

          <div className={styles.toolbar}>
            <button type="button" className={`btn ${styles.zoomBtn}`} aria-label="Aproximar mapa"
              disabled={view.s >= MAX_SCALE} onClick={() => zoomCenter(BUTTON_STEP)}>+</button>
            <button type="button" className={`btn ${styles.zoomBtn}`} aria-label="Afastar mapa"
              disabled={view.s <= MIN_SCALE} onClick={() => zoomCenter(1 / BUTTON_STEP)}>−</button>
            <button type="button" className={`btn ${styles.zoomBtn}`} onClick={() => setView(HOME)}>Restaurar</button>
          </div>
        </>
      )}

      <details open className={styles.details}>
        <summary>Descrição do caminho</summary>
        <p>{map.altText}</p>
        <ol>{map.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </details>
    </figure>
  );
}
