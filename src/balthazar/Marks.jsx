import React from 'react';

/** Marca do Balthazar: pedra na água (dois anéis). */
export function Mark({ size = 15, onDeep = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle
        cx="24" cy="24" r="8" fill="none"
        stroke={onDeep ? '#E8A970' : '#C2703A'}
        strokeWidth="3.2"
      />
      <circle
        cx="24" cy="24" r="17" fill="none"
        stroke={onDeep ? '#8FC2D1' : '#1F4B5C'}
        strokeWidth="2.2"
        opacity={onDeep ? '.75' : '.5'}
      />
    </svg>
  );
}

/** Balthazar em fundo profundo, com ondas se abrindo. `rings` = quantas ondas. */
export function Stone({ className = '', rings = 3 }) {
  return (
    <span className={'stone-wrap ' + className} aria-hidden="true">
      {Array.from({ length: rings }).map((_, i) => (
        <span key={i} className="ring" style={{ animationDelay: `${(i * 3) / rings}s` }} />
      ))}
      <span className="stone">
        <Mark size={20} onDeep />
      </span>
    </span>
  );
}

/** Correntes de rio ao fundo das telas escuras. */
export function Rivers({ className = '' }) {
  return (
    <svg className={'rivers ' + className} preserveAspectRatio="none" viewBox="0 0 1200 700" aria-hidden="true">
      <path className="rv" d="M-100 150 C 180 90, 340 210, 620 150 S 1060 90, 1300 160" stroke="#4E8394" strokeWidth="1.1" opacity=".55" />
      <path className="rv s2" d="M-100 280 C 220 220, 380 340, 640 280 S 1080 220, 1300 290" stroke="#8FC2D1" strokeWidth=".9" opacity=".38" />
      <path className="rv s3" d="M-100 430 C 200 370, 400 490, 660 430 S 1080 370, 1300 440" stroke="#4E8394" strokeWidth="1.3" opacity=".42" />
      <path className="rv s4" d="M-100 560 C 240 500, 420 620, 680 560 S 1100 500, 1300 570" stroke="#C2703A" strokeWidth=".9" opacity=".3" />
      <path className="rv s2" d="M-100 660 C 180 610, 360 710, 620 655 S 1060 600, 1300 665" stroke="#8FC2D1" strokeWidth=".8" opacity=".25" />
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
