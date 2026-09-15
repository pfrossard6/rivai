import React, { useEffect, useState } from 'react';
import { Rivers } from './Marks.jsx';

/**
 * Abertura animada: a pedra cai, as ondas se abrem, aparece o nome.
 * Some sozinha; um toque pula.
 */
export default function Splash({ onDone }) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = setTimeout(() => setSaindo(true), reduzido ? 600 : 2400);
    const t2 = setTimeout(onDone, reduzido ? 900 : 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className={'splash' + (saindo ? ' out' : '')} onClick={onDone} role="presentation">
      <Rivers className="sp-rivers" />
      <div className="sp-core">
        <span className="rg a" />
        <span className="rg b" />
        <span className="rg c" />
        <span className="sp-stone" />
      </div>
      <p className="sp-name">
        Riv<span className="d">.</span>AI
      </p>
      <p className="sp-tag">o rumo certo, sem ruído</p>
    </div>
  );
}
