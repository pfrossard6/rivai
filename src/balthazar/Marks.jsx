import React from 'react';

/* =============================================================
   Marca do Balthazar: um monóculo.

   Duas versões, escolhidas pelo tamanho:
     - compacta  (< 34px): aro, vidro e corrente inteiriça
     - detalhada (>= 34px): corrente pontilhada, sombra e reflexo

   `onDeep` = está sobre o azul profundo (modo voz, abertura).
   ============================================================= */

let seq = 0;
function useUid() {
  const ref = React.useRef(null);
  if (ref.current === null) {
    seq += 1;
    ref.current = 'mn' + seq;
  }
  return ref.current;
}

const OURO_CLARO = ['#EBD29B', '#B58F4C', '#83642F', '#CCA968'];
const OURO_FUNDO = ['#FBEFD3', '#DFC795', '#93805A', '#E6D0A2'];

/** Monóculo. */
export function Mark({ size = 15, onDeep = false }) {
  const id = useUid();
  const ouro = onDeep ? OURO_FUNDO : OURO_CLARO;
  const detalhado = size >= 34;

  const aro = (
    <linearGradient id={id + 'm'} x1="18%" y1="4%" x2="82%" y2="96%">
      <stop offset="0%" stopColor={ouro[0]} />
      <stop offset="38%" stopColor={ouro[1]} />
      <stop offset="66%" stopColor={ouro[2]} />
      <stop offset="100%" stopColor={ouro[3]} />
    </linearGradient>
  );

  if (!detalhado) {
    return (
      <svg width={size} height={size * 1.08} viewBox="0 0 48 52" aria-hidden="true" className="mn mn-compacto">
        <defs>{aro}</defs>
        <g className="mn-corrente">
          <path d="M35 14 C 40 10, 43 6, 44 2.5" fill="none" stroke={ouro[1]} strokeWidth="1.7" strokeLinecap="round" />
        </g>
        <circle cx="22" cy="26" r="11.6" fill={onDeep ? 'rgba(191,212,222,.10)' : '#ECEEEA'} />
        {!onDeep && <circle cx="22" cy="26" r="11.6" fill="#1F4B5C" opacity=".10" />}
        <circle cx="22" cy="26" r="13.2" fill="none" stroke={`url(#${id}m)`} strokeWidth="3.1" />
        <path
          d="M14.5 21.5 A 10 10 0 0 1 20 16.5"
          fill="none"
          stroke={onDeep ? 'rgba(251,239,211,.62)' : 'rgba(255,255,255,.85)'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size * 1.05} viewBox="0 0 200 210" aria-hidden="true" className="mn mn-detalhado">
      <defs>
        {aro}
        <radialGradient id={id + 'v'} cx="36%" cy="30%" r="82%">
          <stop offset="0%" stopColor="#BFD4DE" stopOpacity={onDeep ? '.16' : '.22'} />
          <stop offset="62%" stopColor="#5E8195" stopOpacity=".08" />
          <stop offset="100%" stopColor="#05101A" stopOpacity={onDeep ? '.34' : '.16'} />
        </radialGradient>
        <radialGradient id={id + 'l'} cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor="#F6E7C4" />
          <stop offset="55%" stopColor="#D9C08E" />
          <stop offset="100%" stopColor="#8C7A57" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id + 'c'}>
          <circle cx="100" cy="104" r="48" />
        </clipPath>
      </defs>

      <ellipse className="mn-sombra" cx="104" cy="171" rx="44" ry="8" fill={onDeep ? '#04090E' : '#2A2D2F'} opacity={onDeep ? '.5' : '.16'} />

      <g className="mn-conjunto">
        <g className="mn-corrente">
          <path d="M152 46 C 170 32, 182 20, 186 6" fill="none" stroke={ouro[1]} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.8 4.6" />
          <circle cx="186" cy="4" r="3.6" fill="none" stroke={ouro[1]} strokeWidth="1.6" />
          <circle cx="148" cy="52" r="4.6" fill="none" stroke={`url(#${id}m)`} strokeWidth="2.6" />
        </g>

        <g className="mn-vidro">
          <circle cx="100" cy="104" r="48" fill={onDeep ? `url(#${id}v)` : '#E9EBE7'} />
          {!onDeep && <circle cx="100" cy="104" r="48" fill="#1F4B5C" opacity=".08" />}
          <circle className="mn-miolo" cx="100" cy="104" r="44" fill={`url(#${id}l)`} />
          <g clipPath={`url(#${id}c)`}>
            <g className="mn-faixa">
              <path
                d="M82 46 C 96 74, 96 134, 82 162"
                fill="none"
                stroke={onDeep ? 'rgba(246,231,196,.62)' : 'rgba(255,255,255,.95)'}
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M101 46 C 115 74, 115 134, 101 162"
                fill="none"
                stroke={onDeep ? 'rgba(246,231,196,.26)' : 'rgba(255,255,255,.5)'}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>
          </g>
          <path
            d="M68 84 A 42 42 0 0 1 97 58"
            fill="none"
            stroke={onDeep ? 'rgba(251,239,211,.62)' : 'rgba(255,255,255,.9)'}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>

        <circle className="mn-aro" cx="100" cy="104" r="53.4" fill="none" stroke={`url(#${id}m)`} strokeWidth="5.2" transform="rotate(-90 100 104)" />
        <circle cx="100" cy="104" r="50.6" fill="none" stroke={onDeep ? 'rgba(251,239,211,.42)' : 'rgba(255,255,255,.6)'} strokeWidth=".9" />
      </g>
    </svg>
  );
}

/** Monóculo grande com as ondas se abrindo. `rings` = quantas ondas. */
export function Stone({ className = '', rings = 2, onDeep = false }) {
  return (
    <span className={'stone-wrap ' + className} aria-hidden="true">
      {Array.from({ length: rings }).map((_, i) => (
        <span key={i} className="ring" style={{ animationDelay: `${(i * 3.4) / Math.max(1, rings)}s` }} />
      ))}
      <span className="stone">
        <Mark size={onDeep ? 150 : 58} onDeep={onDeep} />
      </span>
    </span>
  );
}

/** Correntes de rio ao fundo das telas escuras. */
export function Rivers({ className = '' }) {
  return (
    <svg className={'rivers ' + className} preserveAspectRatio="none" viewBox="0 0 1200 700" aria-hidden="true">
      <path className="rv" d="M-100 150 C 180 90, 340 210, 620 150 S 1060 90, 1300 160" stroke="#2F5568" strokeWidth="1.1" opacity=".55" />
      <path className="rv s2" d="M-100 280 C 220 220, 380 340, 640 280 S 1080 220, 1300 290" stroke="#4E8394" strokeWidth=".9" opacity=".38" />
      <path className="rv s3" d="M-100 430 C 200 370, 400 490, 660 430 S 1080 370, 1300 440" stroke="#4E8394" strokeWidth="1.3" opacity=".42" />
      <path className="rv s4" d="M-100 560 C 240 500, 420 620, 680 560 S 1100 500, 1300 570" stroke="#8C7A57" strokeWidth=".9" opacity=".3" />
      <path className="rv s2" d="M-100 660 C 180 610, 360 710, 620 655 S 1060 600, 1300 665" stroke="#4E8394" strokeWidth=".8" opacity=".25" />
    </svg>
  );
}

/** Onda de áudio; anima só quando `active`. */
export function Wave({ active, bars = 9 }) {
  return (
    <div className={'wave' + (active ? ' on' : '')} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <i key={i} style={{ animationDelay: `${i * 0.09}s` }} />
      ))}
    </div>
  );
}

/** Converte **negrito** em <strong>, sem injetar HTML. */
export function richText(text) {
  const parts = String(text || '').split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
}

/** Cartão de informação do modo voz. */
export function HudCard({ card, style }) {
  return (
    <div className={'hud-card' + (card.warn ? ' warn' : '')} style={style}>
      <div className="k">{card.k}</div>
      {card.v && (
        <div className="v">
          {card.v}
          {card.small && <small>{card.small}</small>}
        </div>
      )}
      {card.rows &&
        card.rows.map((r, i) => (
          <div className="hr" key={i}>
            <span className="t">{r[0]}</span>
            <span>{r[1]}</span>
          </div>
        ))}
      {typeof card.pct === 'number' && (
        <div className="tr">
          <div className={'fl' + (card.warn ? ' w' : '')} style={{ width: Math.min(100, card.pct) + '%' }} />
        </div>
      )}
      {card.s && <div className="s">{card.s}</div>}
    </div>
  );
}
