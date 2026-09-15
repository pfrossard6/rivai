import React, { useState, useEffect } from 'react';
import { Stone, Rivers, Wave, HudCard } from './Marks.jsx';
import { textoLimpo } from './useBalthazar.js';

/**
 * Modo voz — tela escura (mockup "Voz em tela cheia").
 *
 * Desktop: histórico à esquerda, pedra e fala no centro, cartões à direita,
 *          campo para digitar embaixo.
 * Celular: um cartão no topo, pedra e fala no centro, botão embaixo;
 *          "digitar" abre a conversa clara.
 */

function hhmm(d) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Junta pergunta e última resposta em pares, mais recentes primeiro. */
function pares(messages) {
  const out = [];
  messages.forEach((m) => {
    if (m.role === 'user') out.push({ q: m.text, a: '', at: m.at });
    else if (out.length) out[out.length - 1].a = m.text;
  });
  return out.reverse();
}

export default function VoiceMode({ api, cards, mobile, onClose, onOpenChat }) {
  const [texto, setTexto] = useState('');
  const [tudo, setTudo] = useState(false);
  const { messages, busy, listening, speaking, liveText } = api;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lista = pares(messages);
  const ultimoUser = lista[0];

  let fala;
  if (listening) fala = liveText || <span className="dim">pode falar…</span>;
  else if (ultimoUser) fala = ultimoUser.q;
  else fala = <span className="dim">toque na pedra e fale</span>;

  let meta = 'toque para falar';
  if (listening) meta = 'ouvindo · toque para enviar';
  else if (busy) meta = 'pensando…';
  else if (speaking) meta = 'falando…';

  const resposta = !listening && ultimoUser && ultimoUser.a ? textoLimpo(ultimoUser.a) : '';

  function enviarTexto() {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    api.send(t, false);
  }

  const mostrados = mobile ? cards.slice(0, 1) : cards.slice(0, 3);

  return (
    <div className={'vm' + (mobile ? ' vm-mobile' : '')} role="dialog" aria-label="Balthazar — modo voz">
      <Rivers />

      <button className="vm-close" type="button" onClick={onClose} aria-label="Fechar">✕</button>

      {/* ---- histórico (desktop) ---- */}
      {!mobile && lista.length > 0 && (
        <div className={'vm-hist' + (tudo ? ' all' : '')}>
          <div className="hk">Conversa</div>
          {(tudo ? lista : lista.slice(0, 3)).map((p, i) => (
            <div className="h" key={i}>
              <div className="q">"{p.q}"</div>
              {p.a && <div className="a">{textoLimpo(p.a)}</div>}
              <div className="tm">{hhmm(p.at)}</div>
            </div>
          ))}
          {lista.length > 3 && (
            <button className="more" type="button" onClick={() => setTudo((v) => !v)}>
              {tudo ? '← recolher' : 'ver tudo →'}
            </button>
          )}
        </div>
      )}

      {/* ---- cartões ---- */}
      <div className="vm-hud">
        {mostrados.map((c, i) => (
          <HudCard key={c.k + i} card={c} style={{ animationDelay: `${0.15 * (i + 1)}s` }} />
        ))}
      </div>

      {/* ---- centro ---- */}
      <div className="vm-center">
        <button
          className={'vm-core' + (listening ? ' on' : '')}
          type="button"
          onClick={api.toggleListening}
          disabled={busy || !api.voiceSupported}
          aria-label={listening ? 'Enviar' : 'Falar'}
        >
          <Stone rings={3} />
        </button>

        <p className="said">{fala}</p>
        <Wave active={listening || speaking} />
        <p className="meta">{meta}</p>
        {resposta && <p className="reply">{resposta}</p>}
        {!api.voiceSupported && (
          <p className="reply">Este navegador não reconhece fala. Use o campo de texto.</p>
        )}
      </div>

      {/* ---- rodapé ---- */}
      <div className="vm-foot">
        {api.voiceSupported && (
          <button className="vm-mic" type="button" onClick={api.toggleListening} disabled={busy}>
            <i /> {listening ? 'enviar' : 'falar'}
          </button>
        )}

        {mobile ? (
          <div className="vm-row">
            <button className="vm-link" type="button" onClick={onOpenChat}>digitar</button>
            <button className={'vm-link' + (api.voiceOn ? ' on' : '')} type="button" onClick={api.toggleVoice}>
              {api.voiceOn ? 'com voz' : 'sem voz'}
            </button>
          </div>
        ) : (
          <div className="vm-row">
            <div className="vm-type">
              <input
                type="text"
                value={texto}
                placeholder="ou escreva aqui…"
                onFocus={() => listening && api.cancelListening()}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviarTexto()}
                disabled={busy}
              />
              <button type="button" onClick={enviarTexto} disabled={busy} aria-label="Enviar">↑</button>
            </div>
            <button className={'vm-link' + (api.voiceOn ? ' on' : '')} type="button" onClick={api.toggleVoice}>
              {api.voiceOn ? 'com voz' : 'sem voz'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
