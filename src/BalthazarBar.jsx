import React, { useState } from 'react';
import { getAllTools, getToolHandler, buildSystemPrompt } from './modules/registry.js';

/**
 * Barra fixa do Balthazar — sempre visível, em qualquer módulo.
 *
 * FASE 2: trocar o corpo de sendMessage() pela chamada real ao proxy
 * da Vercel. Repara que tools e system já vêm prontos do registry —
 * não tem nada de módulo hardcoded aqui.
 */
export default function BalthazarBar({ state, setState }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendMessage() {
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    setOpen(true);

    try {
      // ---- FASE 2 ENTRA AQUI ----
      // Trocar por: fetch('/api/balthazar', { ... }) apontando pro proxy
      // que já existe na Vercel. O payload já está montado abaixo.
      const payload = {
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: buildSystemPrompt(state),
        tools: getAllTools(),
        messages: [{ role: 'user', content: text }],
      };
      console.log('payload pronto para a Fase 2:', payload);

      setMessages((m) => [
        ...m,
        { role: 'balthazar', text: 'Ainda não conectado — a Fase 2 liga isso ao proxy da Vercel.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  /** Executa uma tool_use vinda da API, roteando pro módulo dono dela. */
  function runTool(toolName, toolInput) {
    const handler = getToolHandler(toolName);
    if (!handler) return `Não sei executar "${toolName}".`;
    return handler(toolInput, state, setState);
  }

  return (
    <div className="balthazar-bar">
      {open && messages.length > 0 && (
        <div className="balthazar-transcript">
          {messages.map((m, i) => (
            <div className={'msg ' + m.role} key={i}>
              <div className="who">{m.role === 'user' ? 'Você' : 'Balthazar'}</div>
              <div className="body">{m.text}</div>
            </div>
          ))}
        </div>
      )}

      <div className="balthazar-input-row">
        <button className="balthazar-toggle" type="button" onClick={() => setOpen((o) => !o)}>
          {open ? '▾' : '▴'} Balthazar
        </button>
        <input
          type="text"
          value={input}
          placeholder="Fala com o Balthazar…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button className="balthazar-send" type="button" onClick={sendMessage} disabled={busy}>
          Enviar
        </button>
      </div>
    </div>
  );
}
