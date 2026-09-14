import React, { useState, useRef, useEffect } from 'react';
import { getAllTools, getToolHandler, buildSystemPrompt } from './modules/registry.js';

/**
 * Balthazar — conversa e voz.
 *
 * mode="bar"   barra fixa no rodapé (desktop)
 * mode="sheet" tela cheia sobre o painel (celular)
 *
 * Voz: clique para ouvir, clique de novo para enviar. Continua ouvindo
 * nas pausas; o texto é remontado do zero a cada sessão para nunca
 * emendar com a fala anterior.
 */

function Mark({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="8" fill="none" stroke="var(--bz-ember)" strokeWidth="3.2" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="var(--accent)" strokeWidth="2.2" opacity=".5" />
    </svg>
  );
}

function hhmm(d) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Converte **negrito** em <strong>, sem injetar HTML. */
function richText(text) {
  const parts = String(text || '').split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
}

export default function BalthazarBar({ state, setState, mode = 'bar', onClose }) {
  const sheet = mode === 'sheet';

  const [open, setOpen] = useState(sheet);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);

  const history = useRef([]);
  const recognition = useRef(null);
  const finals = useRef('');   // trechos já finalizados desta sessão de fala
  const interim = useRef('');  // trecho parcial em andamento
  const scroller = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, busy, open]);

  const voiceSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  /* ---------------- voz ---------------- */

  function startListening() {
    if (!voiceSupported || listening || busy) return;

    // encerra qualquer sessão anterior antes de abrir outra
    if (recognition.current) {
      try { recognition.current.abort(); } catch (e) { /* já encerrada */ }
      recognition.current = null;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = true;

    finals.current = '';
    interim.current = '';
    setInput('');

    rec.onresult = (e) => {
      let novosFinais = '';
      let parcial = '';
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const t = e.results[k][0].transcript;
        if (e.results[k].isFinal) novosFinais += t;
        else parcial += t;
      }
      if (novosFinais) finals.current += novosFinais;
      interim.current = parcial;
      setInput((finals.current + interim.current).trim());
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognition.current = rec;
    setListening(true);
    setOpen(true);
    rec.start();
  }

  /** Segundo clique: encerra e manda o que entendeu. */
  function stopAndSend() {
    if (recognition.current) {
      try { recognition.current.stop(); } catch (e) { /* já encerrada */ }
    }
    setListening(false);
    const text = (finals.current + interim.current).trim();
    finals.current = '';
    interim.current = '';
    if (text) send(text, true);
    else setInput('');
  }

  /* ---------------- ferramentas ---------------- */

  function runTool(block) {
    const handler = getToolHandler(block.name);
    if (!handler) return { text: `Não sei executar "${block.name}".` };
    try {
      const out = handler(block.input, stateRef.current, setState);
      return typeof out === 'string' ? { text: out } : out;
    } catch (err) {
      console.error('Tool falhou:', block.name, err);
      return { text: `Deu erro ao executar ${block.name}.` };
    }
  }

  async function callApi() {
    const res = await fetch('/api/balthazar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: buildSystemPrompt(stateRef.current),
        messages: history.current,
        tools: getAllTools(),
      }),
    });
    if (!res.ok) throw new Error('Resposta ' + res.status);
    return res.json();
  }

  /* ---------------- envio ---------------- */

  async function send(raw, byVoice = false) {
    const text = (raw ?? input).trim();
    if (!text || busy) return;

    setInput('');
    setOpen(true);
    setMessages((m) => [...m, { role: 'user', text, at: new Date(), byVoice }]);
    history.current.push({ role: 'user', content: text });
    setBusy(true);

    try {
      let rounds = 0;
      while (rounds < 4) {
        rounds += 1;
        const data = await callApi();
        const blocks = data.content || [];

        const said = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        if (said) setMessages((m) => [...m, { role: 'balthazar', text: said, at: new Date() }]);

        history.current.push({ role: 'assistant', content: blocks });

        const toolUses = blocks.filter((b) => b.type === 'tool_use');
        if (!toolUses.length) break;

        const results = [];
        for (const b of toolUses) {
          const out = runTool(b);
          results.push({ type: 'tool_result', tool_use_id: b.id, content: String(out.text || '') });
          setMessages((m) => [...m, { role: 'balthazar', text: out.text, receipt: out.receipt, at: new Date() }]);
        }
        history.current.push({ role: 'user', content: results });
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: 'balthazar', text: 'Não consegui responder agora. Tenta de novo daqui a pouco.', at: new Date() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- pedaços ---------------- */

  const transcript = (
    <div className="bz-chat" ref={scroller}>
      <div className="bz-inner">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="bz-m me" key={i}>
              <div className="bz-body">
                <div className="bz-tx">{m.text}</div>
                <div className="bz-ts">{hhmm(m.at)}{m.byVoice && ' · por voz'}</div>
              </div>
            </div>
          ) : (
            <div className="bz-m" key={i}>
              <span className="bz-ring"><Mark size={13} /></span>
              <div className="bz-body">
                <div className="bz-tx">{richText(m.text)}</div>
                {m.receipt && (
                  <div className="bz-rc">
                    <div className="bz-rc-k">{m.receipt.label}</div>
                    <div className="bz-rc-r">
                      <span>{m.receipt.left}</span>
                      <span>{m.receipt.right}</span>
                    </div>
                    <div className="bz-rc-tr">
                      <div
                        className={'bz-rc-fl' + (m.receipt.warn ? ' warn' : '')}
                        style={{ width: Math.min(100, m.receipt.pct || 0) + '%' }}
                      />
                    </div>
                  </div>
                )}
                <div className="bz-ts">{hhmm(m.at)}</div>
              </div>
            </div>
          )
        )}

        {busy && (
          <div className="bz-m">
            <span className="bz-ring"><Mark size={13} /></span>
            <div className="bz-body"><div className="bz-typing"><i /><i /><i /></div></div>
          </div>
        )}

        {sheet && messages.length === 0 && !busy && (
          <p className="bz-empty">Fala comigo. "gastei 38 no almoço", "consulta amanhã 9h" — eu acho o lugar certo.</p>
        )}
      </div>
    </div>
  );

  const composer = (
    <div className={'bz-inp' + (listening ? ' listening' : '')}>
      <input
        type="text"
        value={input}
        placeholder={listening ? 'Ouvindo… toque para enviar' : 'Fala com o Balthazar…'}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        disabled={busy}
      />
      {voiceSupported && (
        <button
          className={'bz-mic' + (listening ? ' on' : '')}
          type="button"
          title={listening ? 'Enviar' : 'Falar'}
          onClick={listening ? stopAndSend : startListening}
          disabled={busy}
        >
          ◉
        </button>
      )}
      <button className="bz-send" type="button" onClick={() => send()} disabled={busy}>↑</button>
    </div>
  );

  /* ---------------- celular: tela cheia ---------------- */

  if (sheet) {
    return (
      <div className="bz-sheet">
        <header className="bz-sheet-hd">
          <span className="bz-ring"><Mark size={15} /></span>
          <div>
            <div className="nm">Balthazar</div>
            <div className="st">{listening ? 'ouvindo…' : 'sempre por perto'}</div>
          </div>
          <button className="bz-x" type="button" onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        {transcript}

        <div className="bz-sheet-ft">{composer}</div>
      </div>
    );
  }

  /* ---------------- desktop: barra ---------------- */

  return (
    <div className="bz-bar">
      {open && (messages.length > 0 || busy) && transcript}

      <div className="bz-foot">
        <div className="bz-inner bz-row">
          <button className="bz-toggle" type="button" onClick={() => setOpen((o) => !o)}>
            <span className="bz-ring sm"><Mark size={12} /></span>
            Balthazar
          </button>
          {composer}
        </div>
      </div>
    </div>
  );
}
