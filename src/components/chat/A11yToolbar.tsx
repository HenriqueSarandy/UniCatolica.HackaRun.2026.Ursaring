"use client";

import { useEffect, useState } from "react";
import { applyFontSize, applyTheme, getFontSize, getTheme, nextFontSize, type Theme } from "@/lib/client/prefs";

export default function A11yToolbar() {
  const [size, setSize] = useState(20);
  const [theme, setTheme] = useState<Theme>("default");

  useEffect(() => {
    const s = getFontSize();
    const t = getTheme();
    setSize(s); setTheme(t);
    applyFontSize(s); applyTheme(t);
  }, []);

  const toggle = (t: Exclude<Theme, "default">) => {
    const next = theme === t ? "default" : t;
    setTheme(next); applyTheme(next);
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Acessibilidade">
      <button
        type="button" className="btn"
        aria-label={`Aumentar letra. Tamanho atual ${size} pixels`}
        onClick={() => { const n = nextFontSize(size); setSize(n); applyFontSize(n); }}
      >
        A+
      </button>
      <button type="button" className="btn" aria-pressed={theme === "contrast"} onClick={() => toggle("contrast")}>
        Alto contraste
      </button>
      <button type="button" className="btn" aria-pressed={theme === "dark"} onClick={() => toggle("dark")}>
        Modo escuro
      </button>
    </div>
  );
}
