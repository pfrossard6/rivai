import React, { useState, useRef, useEffect } from 'react';
import { getAllTools, getToolHandler, buildSystemPrompt } from './modules/registry.js';

/**
 * Balthazar — conversa e voz.
 *
 * mode="bar"   barra fixa no rodapé (desktop)
 * mode="sheet" tela cheia sobre o painel (celular)
 *
 * Ouvir: clique para ouvir, clique de novo para enviar. Continua ouvindo
 * nas pausas; o texto é remontado do zero a cada sessão.
 *
 * Falar: quando a pergunta vem por voz, a resposta é lida em voz alta
 * (ElevenLabs via /api/voz; se falhar, usa a voz do aparelho).
 * Pergunta digitada recebe só texto — economiza custo.
 *
 * Custo: só as últimas perguntas vão para a API, para o histórico
 * (que inclui resultados de pesquisa) não crescer sem limite.
 */

const VOICE_PREF_KEY = 'rivai:voz';
const MAX_TURNOS = 6;
const MAX_RODADAS = 6;
const SILENCIO =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const NOTA_VOZ =
  '\n\nESTA MENSAGEM VEIO POR VOZ e a resposta será lida em voz alta: responda em no máximo duas frases curtas, sem listas, sem negrito e sem links.';

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

/**
 * Junta os blocos de texto da resposta. Quando há uma pesquisa no meio,
 * separa em trechos (ex.: "Vou verificar." / resposta final).
 */
function trechosDeTexto(blocks) {
  const partes = [];
  let atual = '';
  blocks.forEach((b) => {
    if (b.type === 'text') {
      atual += b.text;
    } else if (atual.trim()) {
      partes.push(atual.trim());
      atual = '';
    }
  });
  if (atual.trim()) partes.push(atual.trim());
  return partes;
}

/** Tira marcações que não fazem sentido faladas. */
function paraFala(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

/** Mantém só as últimas perguntas, começando sempre numa pergunta de texto. */
function aparar(hist) {
  const inicios = [];
  hist.forEach((m, i) => {
    if (m.role === 'user' && typeof m.content === 'string') inicios.push(i);
  });
  if (inicios.length <= MAX_TURNOS) return hist;
  return hist.slice(inicios[inicios.length - MAX_TURNOS]);
}

function lerPreferenciaVoz() {
  try {
    return window.localStorage.getItem(VOICE_PREF_KEY) !== 'off';
  } catch (e) {
    return true;
  }
}

export default function BalthazarBar({ state, setState, mode = 'bar', onClose }) {
  const sheet = mode === 'sheet';

  const [open, setOpen] = useState(sheet);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(lerPreferenciaVoz);
  const [speaking, setSpeaking] = useState(false);

  const history = useRef([]);
  const recognition = useRef(null);
  const finals = useRef('');   // trechos já finalizados desta sessão de fala
  const interim = useRef('');  // trecho parcial em andamento
  const scroller = useRef(null);
  const stateRef = useRef(state);
  const voiceRef = useRef(voiceOn);
  const audio = useRef(null);
  const audioUrl = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, busy, open]);

  const voiceSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  /* ---------------- falar ---------------- */

  function garantirAudio() {
    if (!audio.current) audio.current = new Audio();
    return audio.current;
  }

  /** Precisa rodar dentro de um toque: libera o som no iPhone. */
  function liberarSom() {
    const a = garantirAudio();
    if (a.dataset.liberado) return;
    a.src = SILENCIO;
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* sem som, tudo bem */ });
    a.dataset.liberado = '1';
  }

  function pararFala() {
    if (audio.current) audio.current.pause();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioUrl.current) {
      URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = null;
    }
    setSpeaking(false);
  }

  function falarPeloAparelho(texto) {
    const synth = window.speechSynthesis;
    if (!synth) {
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    const voz = synth.getVoices().find((v) => (v.lang || '').toLowerCase().startsWith('pt'));
    if (voz) u.voice = voz;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  async function falar(textoBruto) {
    const texto = paraFala(textoBruto);
    if (!texto) return;
    pararFala();
    setSpeaking(true);
    try {
      const res = await fetch('/api/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texto }),
      });
      if (!res.ok) throw new Error('voz ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrl.current = url;
      const a = garantirAudio();
      a.onended = () => pararFala();
      a.src = url;
      await a.play();
    } catch (err) {
      console.warn('Voz do Balthazar indisponível, usando a do aparelho:', err);
      falarPeloAparelho(texto);
    }
  }

  function alternarVoz() {
    const novo = !voiceOn;
    setVoiceOn(novo);
    voiceRef.current = novo;
    try {
      window.localStorage.setItem(VOICE_PREF_KEY, novo ? 'on' : 'off');
    } catch (e) { /* navegador sem armazenamento */ }
    if (novo) liberarSom();
    else pararFala();
  }

  function fechar() {
    pararFala();
    if (onClose) onClose();
  }

  /* ---------------- ouvir ---------------- */

  function startListening() {
    if (!voiceSupported || listening || busy) return;

    pararFala();
    liberarSom();

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

  async function callApi(extra) {
    const res = await fetch('/api/balthazar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: buildSystemPrompt(stateRef.current) + (extra || ''),
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

    const antes = history.current.slice();
    history.current.push({ role: 'user', content: text });
    history.current = aparar(history.current);
    setBusy(true);

    let ultimaFala = '';

    try {
      let rounds = 0;
      let pausado = false;

      while (rounds < MAX_RODADAS) {
        rounds += 1;
        const data = await callApi(byVoice ? NOTA_VOZ : '');
        const blocks = data.content || [];

        const trechos = trechosDeTexto(blocks);
        if (trechos.length) {
          ultimaFala = trechos[trechos.length - 1];
          setMessages((m) => [
            ...m,
            { role: 'balthazar', text: trechos.join('\n\n'), at: new Date() },
          ]);
        }

        // pesquisa longa: a API pausa e a resposta continua na próxima rodada
        const ultimo = history.current[history.current.length - 1];
        if (pausado && ultimo && ultimo.role === 'assistant') {
          ultimo.content = [...ultimo.content, ...blocks];
        } else {
          history.current.push({ role: 'assistant', content: blocks });
        }

        pausado = data.stop_reason === 'pause_turn';
        if (pausado) continue;

        const toolUses = blocks.filter((b) => b.type === 'tool_use');
        if (!toolUses.length) break;

        const results = [];
        for (const b of toolUses) {
          const out = runTool(b);
          results.push({ type: 'tool_result', tool_use_id: b.id, content: String(out.text || '') });
          setMessages((m) => [...m, { role: 'balthazar', text: out.text, receipt: out.receipt, at: new Date() }]);
          if (out.text) ultimaFala = out.text;
        }
        history.current.push({ role: 'user', content: results });
      }
    } catch (err) {
      console.error(err);
      history.current = antes;
      ultimaFala = '';
      setMessages((m) => [
        ...m,
        { role: 'balthazar', text: 'Não consegui responder agora. Tenta de novo daqui a pouco.', at: new Date() },
      ]);
    } finally {
      setBusy(false);
    }

    if (byVoice && voiceRef.current && ultimaFala) falar(ultimaFala);
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
          <p className="bz-empty">
            Fala comigo. "gastei 38 no almoço", "consulta amanhã 9h", "como está o dólar hoje?" — eu acho o lugar certo.
          </p>
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

  const voiceToggle = (
    <button
      className={'bz-voice' + (voiceOn ? ' on' : '')}
      type="button"
      onClick={alternarVoz}
      title={voiceOn ? 'Respostas faladas ligadas' : 'Respostas faladas desligadas'}
    >
      {voiceOn ? 'com voz' : 'sem voz'}
    </button>
  );

  let status = 'sempre por perto';
  if (listening) status = 'ouvindo…';
  else if (busy) status = 'pensando…';
  else if (speaking) status = 'falando…';

  /* ---------------- celular: tela cheia ---------------- */

  if (sheet) {
    return (
      <div className="bz-sheet">
        <header className="bz-sheet-hd">
          <span className="bz-ring"><Mark size={15} /></span>
          <div>
            <div className="nm">Balthazar</div>
            <div className="st">{status}</div>
          </div>
          <div className="bz-sheet-actions">
            {voiceToggle}
            <button className="bz-x" type="button" onClick={fechar} aria-label="Fechar">✕</button>
          </div>
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
          {voiceToggle}
        </div>
      </div>
    </div>
  );
}
