import React, { useEffect, useState, useCallback } from 'react';
import { Mark, richText } from './Marks.jsx';

/**
 * Tutorial automático: o Balthazar apresenta a tela sozinho,
 * destacando cada parte. Passos cujo alvo não está na tela são pulados.
 * Alvos são marcados com data-tour="…".
 */

const PASSOS = [
  {
    ms: 4400,
    alvo: null,
    texto: ['Oi, Pedro. Eu sou o **Balthazar**.', 'Deixa eu te mostrar como isso aqui funciona — não precisa clicar em nada.'],
  },
  {
    ms: 4800,
    alvo: 'pace',
    texto: ['Começo sempre te dizendo **o que vem**, não o que passou: quanto sobra por dia até o fim do mês.'],
  },
  {
    ms: 4800,
    alvo: 'cats',
    texto: ['Seus limites. Eu comparo com o mês anterior sozinho e **aviso antes de estourar**.'],
  },
  {
    ms: 4600,
    alvo: 'hist',
    texto: ['Tudo que você me fala vira lançamento aqui. O que veio **por voz** fica marcado.'],
  },
  {
    ms: 4800,
    alvo: 'nav',
    texto: ['Essas são suas áreas. Você **nunca precisa escolher uma** antes de falar comigo — eu acho o lugar certo.'],
  },
  {
    ms: 5600,
    alvo: 'orb',
    texto: ['É por aqui que você fala comigo. **Toque e fale** do seu jeito.', 'Vamos criar seu primeiro limite?'],
  },
];

const LARG = 340;

/** Primeiro elemento visível com data-tour igual ao alvo. */
function acharAlvo(nome) {
  if (!nome) return null;
  const els = document.querySelectorAll(`[data-tour="${nome}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function Tour({ onDone }) {
  const [passos] = useState(() => PASSOS.filter((p) => !p.alvo || acharAlvo(p.alvo)));
  const [i, setI] = useState(0);
  const [pos, setPos] = useState(null);
  const [visivel, setVisivel] = useState(false);

  const passo = passos[i];

  const posicionar = useCallback(() => {
    if (!passo) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const larg = Math.min(LARG, vw - 32);
    const el = acharAlvo(passo.alvo);

    if (!el) {
      setPos({ spot: null, left: (vw - larg) / 2, top: vh / 2 - 90, larg });
      return;
    }

    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const r = el.getBoundingClientRect();
    const pad = 10;
    const spot = { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 };

    let left;
    let top;
    if (vw < 760) {
      left = (vw - larg) / 2;
      top = r.bottom + 18;
      if (top + 190 > vh) top = Math.max(16, r.top - 190 - 18);
    } else {
      left = r.right + 24;
      if (left + larg > vw - 16) left = r.left - larg - 24;
      if (left < 16) left = 16;
      top = r.top + Math.min(r.height / 2 - 60, 40);
      if (top + 210 > vh) top = vh - 222;
      if (top < 16) top = 16;
    }
    setPos({ spot, left, top, larg });
  }, [passo]);

  /* avança sozinho */
  useEffect(() => {
    if (!passo) {
      onDone();
      return undefined;
    }
    setVisivel(false);
    const t0 = setTimeout(() => {
      posicionar();
      setVisivel(true);
    }, 340);
    const t1 = setTimeout(() => setI((n) => n + 1), passo.ms);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, [passo, posicionar, onDone]);

  useEffect(() => {
    window.addEventListener('resize', posicionar);
    return () => window.removeEventListener('resize', posicionar);
  }, [posicionar]);

  if (!passo) return null;

  return (
    <div className="tour">
      <div className={'tour-veil' + (pos && !pos.spot ? ' on' : '')} />
      {pos && pos.spot && <div className="tour-spot" style={pos.spot} />}

      {pos && (
        <div
          className={'tour-say' + (visivel ? ' on' : '')}
          style={{ left: pos.left, top: pos.top, width: pos.larg }}
        >
          <div className="say-in">
            <div className="say-hd">
              <span className="say-mk"><Mark size={15} onDeep /></span>
              <span className="nm">Balthazar</span>
              <span className="say-wv"><i /><i /><i /><i /></span>
            </div>
            {passo.texto.map((t, k) => (
              <p key={k}>{richText(t)}</p>
            ))}
            <div className="prog">
              <i key={i} style={{ animationDuration: `${passo.ms - 400}ms` }} />
            </div>
          </div>
        </div>
      )}

      <button className="tour-skip" type="button" onClick={onDone}>pular</button>
    </div>
  );
}
