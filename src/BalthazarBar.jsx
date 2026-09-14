import React, { useState, useRef, useEffect } from 'react';
import { getAllTools, getToolHandler, buildSystemPrompt } from './modules/registry.js';

/**
 * Barra fixa do Balthazar — agora conectada de verdade.
 *
 * Fluxo de uma mensagem:
 *   1. manda o histórico + tools + system para /api/balthazar
 *   2. se a resposta trouxer tool_use, executa via o módulo dono da tool
 *   3. devolve o tool_result para a API e pede a resposta final
 *   4. repete enquanto vier tool_use (limite de 4 voltas, por segurança)
 *
 * A voz usa o reconhecimento nativo do navegador. Funciona bem no Chrome;
 * no Safari é limitado, por isso o botão só aparece quando há suporte.
 */
export default function BalthazarBar({ state, setState }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);

  // Histórico no formato da API (diferente do que aparece na tela).
  const history = useRef([]);
  const recognition = useRef(null);
  const scroller = useRef(null);
  const stateRef = useRef(state);

  // Handlers leem o estado por ref para não pegar valor velho no meio do ciclo.
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, busy]);

  const voiceSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  function startListening() {
    if (!voiceSupported || listening) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join('');
      setInput(text);
      // Resultado final: manda sozinho, sem precisar apertar nada.
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        send(text);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognition.current = rec;
    setListening(true);
    rec.start();
  }

  function stopListening() {
    if (recognition.current) recognition.current.stop();
    setListening(false);
  }

  /** Roda uma tool_use, roteando para o módulo dono dela. */
  function runTool(block) {
    const handler = getToolHandler(block.name);
    if (!handler) return `Não sei executar "${block.name}".`;
    try {
      return handler(block.input, stateRef.current, setState);
    } catch (err) {
      console.error('Tool falhou:', block.name, err);
      return `Deu erro ao executar ${block.name}.`;
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

  async function send(raw) {
    const text = (raw ?? input).trim();
    if (!text || busy) return;

    setInput('');
    setOpen(true);
    setMessages((m) => [...m, { role: 'user', text }]);
    history.current.push({ role: 'user', content: text });
    setBusy(true);

    try {
      let rounds = 0;

      while (rounds < 4) {
        rounds += 1;
        const data = await callApi();
        const blocks = data.content || [];

        // Texto que veio nesta volta
        const said = blocks
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        if (said) setMessages((m) => [...m, { role: 'balthazar', text: said }]);

        // O histórico guarda a resposta inteira, blocos e tudo.
        history.current.push({ role: 'assistant', content: blocks });

        const toolUses = blocks.filter((b) => b.type === 'tool_use');
        if (!toolUses.length) break;

        // Executa cada tool e devolve os resultados numa só mensagem.
        const results = toolUses.map((b) => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: String(runTool(b)),
        }));
        history.current.push({ role: 'user', content: results });
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: 'balthazar', text: 'Não consegui responder agora. Tenta de novo daqui a pouco.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="balthazar-bar">
      {open && messages.length > 0 && (
        <div className="balthazar-transcript" ref={scroller}>
          {messages.map((m, i) => (
            <div className={'msg ' + m.role} key={i}>
              <div className="who">{m.role === 'user' ? 'Você' : 'Balthazar'}</div>
              <div className="body">{m.text}</div>
            </div>
          ))}
          {busy && (
            <div className="msg balthazar">
              <div className="who">Balthazar</div>
              <div className="body pensando">pensando…</div>
            </div>
          )}
        </div>
      )}

      <div className="balthazar-input-row">
        <button className="balthazar-toggle" type="button" onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▴'} Balthazar
        </button>

        <input
          type="text"
          value={input}
          placeholder={listening ? 'Ouvindo…' : 'Fala com o Balthazar…'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={busy}
        />

        {voiceSupported && (
          <button
            className={'balthazar-mic' + (listening ? ' on' : '')}
            type="button"
            title={listening ? 'Parar' : 'Falar'}
            onClick={listening ? stopListening : startListening}
            disabled={busy}
          >
            ◉
          </button>
        )}

        <button className="balthazar-send" type="button" onClick={() => send()} disabled={busy}>
          ↑
        </button>
      </div>
    </div>
  );
}
