import React, { useState, useRef, useEffect } from 'react';
import { Mark, richText } from './Marks.jsx';

/**
 * Conversa em tela cheia — celular (mockup "Conversa").
 * O microfone abre o modo voz já ouvindo.
 */

function hhmm(d) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatSheet({ api, context, onClose, onVoice }) {
  const [texto, setTexto] = useState('');
  const scroller = useRef(null);
  const { messages, busy } = api;

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, busy]);

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    api.send(t, false);
  }

  let status = context ? `vendo ${context.toLowerCase()}` : 'sempre por perto';
  if (busy) status = 'pensando…';
  else if (api.speaking) status = 'falando…';

  return (
    <div className="chat-sheet">
      <header className="cs-hd">
        <span className="ring-badge"><Mark size={15} /></span>
        <div>
          <div className="nm">Balthazar</div>
          <div className="st">{status}</div>
        </div>
        <div className="cs-actions">
          <button className={'pill' + (api.voiceOn ? ' on' : '')} type="button" onClick={api.toggleVoice}>
            {api.voiceOn ? 'com voz' : 'sem voz'}
          </button>
          <button className="cs-x" type="button" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
      </header>

      <div className="cs-body" ref={scroller}>
        {messages.length === 0 && !busy && (
          <p className="cs-empty">
            Fala comigo do seu jeito. "gastei 38 no almoço", "consulta amanhã 9h", "como está o dólar hoje?" — eu acho o lugar certo.
          </p>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="msg me" key={i}>
              <div>
                <div className="tx">{m.text}</div>
                <div className="ts">{hhmm(m.at)}{m.byVoice && ' · por voz'}</div>
              </div>
            </div>
          ) : (
            <div className="msg" key={i}>
              <span className="ring-badge sm"><Mark size={12} /></span>
              <div>
                <div className="tx">
                  {richText(m.text)}
                  {m.receipt && (
                    <div className="rc">
                      <div className="k">{m.receipt.label}</div>
                      <div className="r">
                        <span>{m.receipt.left}</span>
                        <span>{m.receipt.right}</span>
                      </div>
                      <div className="tr">
                        <div
                          className={'fl' + (m.receipt.warn ? ' w' : '')}
                          style={{ width: Math.min(100, m.receipt.pct || 0) + '%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="ts">{hhmm(m.at)}</div>
              </div>
            </div>
          )
        )}

        {busy && (
          <div className="msg">
            <span className="ring-badge sm"><Mark size={12} /></span>
            <div className="typing"><i /><i /><i /></div>
          </div>
        )}
      </div>

      <div className="cs-ft">
        <div className="inp">
          <input
            type="text"
            value={texto}
            placeholder="Fala com o Balthazar…"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            disabled={busy}
          />
          {texto.trim() ? (
            <button className="send" type="button" onClick={enviar} disabled={busy} aria-label="Enviar">↑</button>
          ) : (
            api.voiceSupported && (
              <button className="mic" type="button" onClick={onVoice} disabled={busy} aria-label="Falar">◉</button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
