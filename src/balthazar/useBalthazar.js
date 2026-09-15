import { useState, useRef, useEffect } from 'react';
import { getAllTools, getToolHandler, buildSystemPrompt } from '../modules/registry.js';

/**
 * Cérebro do Balthazar: conversa, ouvir e falar.
 *
 * Vive uma vez só no app. Modo voz, conversa do celular e avisos
 * leem daqui, então o histórico é o mesmo em todas as telas.
 *
 * Ouvir: startListening abre o microfone; stopAndSend envia; se o
 * navegador encerrar sozinho por silêncio, o que foi ouvido é enviado.
 *
 * Falar: resposta a pergunta por voz é lida em voz alta (ElevenLabs via
 * /api/voz; se falhar, voz do aparelho, preferindo voz masculina).
 *
 * Custo: só as últimas perguntas vão para a API.
 */

const VOICE_PREF_KEY = 'rivai:voz';
const MAX_TURNOS = 6;
const MAX_RODADAS = 6;
const SILENCIO =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const NOTA_VOZ =
  '\n\nESTA MENSAGEM VEIO POR VOZ e a resposta será lida em voz alta: responda em no máximo duas frases curtas, sem listas, sem negrito e sem links.';
const VOZES_MASCULINAS = /felipe|daniel|ricardo|antonio|antônio|thiago|reed|eddy|rocko|grandpa|male|masculin/i;

/** Separa trechos de texto quando há uma pesquisa no meio da resposta. */
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
export function textoLimpo(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

export default function useBalthazar(state, setState) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [voiceOn, setVoiceOn] = useState(lerPreferenciaVoz);
  const [speaking, setSpeaking] = useState(false);

  const history = useRef([]);
  const recognition = useRef(null);
  const finals = useRef('');
  const interim = useRef('');
  const enviado = useRef(false);
  const stateRef = useRef(state);
  const voiceRef = useRef(voiceOn);
  const busyRef = useRef(false);
  const sendRef = useRef(null);
  const audio = useRef(null);
  const audioUrl = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const voiceSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  /* ================= falar ================= */

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

  function stopSpeaking() {
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
    const pt = synth.getVoices().filter((v) => (v.lang || '').toLowerCase().startsWith('pt'));
    const voz = pt.find((v) => VOZES_MASCULINAS.test(v.name)) || pt[0];
    if (voz) u.voice = voz;
    u.pitch = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  async function falar(textoBruto) {
    const texto = textoLimpo(textoBruto).slice(0, 600);
    if (!texto) return;
    stopSpeaking();
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
      a.onended = () => stopSpeaking();
      a.src = url;
      await a.play();
    } catch (err) {
      console.warn('Voz do Balthazar indisponível, usando a do aparelho:', err);
      falarPeloAparelho(texto);
    }
  }

  function toggleVoice() {
    const novo = !voiceRef.current;
    voiceRef.current = novo;
    setVoiceOn(novo);
    try {
      window.localStorage.setItem(VOICE_PREF_KEY, novo ? 'on' : 'off');
    } catch (e) { /* navegador sem armazenamento */ }
    if (novo) liberarSom();
    else stopSpeaking();
  }

  /* ================= ouvir ================= */

  function startListening() {
    if (!voiceSupported || busyRef.current) return false;

    stopSpeaking();
    liberarSom();

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
    enviado.current = false;
    setLiveText('');

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
      setLiveText((finals.current + interim.current).trim());
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (recognition.current !== rec) return;
      recognition.current = null;
      // o navegador encerrou sozinho (silêncio): envia o que ouviu
      const text = (finals.current + interim.current).trim();
      if (!enviado.current && text && sendRef.current) {
        enviado.current = true;
        sendRef.current(text, true);
      }
    };

    recognition.current = rec;
    setListening(true);
    rec.start();
    return true;
  }

  function encerrarReconhecimento() {
    const rec = recognition.current;
    recognition.current = null;
    if (rec) {
      try { rec.stop(); } catch (e) { /* já encerrada */ }
    }
    setListening(false);
  }

  /** Segundo toque: encerra e manda o que entendeu. */
  function stopAndSend() {
    const text = (finals.current + interim.current).trim();
    enviado.current = true;
    encerrarReconhecimento();
    finals.current = '';
    interim.current = '';
    setLiveText('');
    if (text) send(text, true);
  }

  /** Fecha o microfone sem enviar nada. */
  function cancelListening() {
    enviado.current = true;
    encerrarReconhecimento();
    finals.current = '';
    interim.current = '';
    setLiveText('');
  }

  function toggleListening() {
    if (listening) stopAndSend();
    else startListening();
  }

  /* ================= ferramentas ================= */

  function runTool(block, ctx) {
    const handler = getToolHandler(block.name);
    if (!handler) return { text: `Não sei executar "${block.name}".` };
    try {
      const out = handler(block.input, stateRef.current, setState, ctx);
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

  /* ================= envio ================= */

  async function send(raw, byVoice = false) {
    const text = String(raw || '').trim();
    if (!text || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text, at: new Date(), byVoice }]);

    const antes = history.current.slice();
    history.current.push({ role: 'user', content: text });
    history.current = aparar(history.current);

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
          setMessages((m) => [...m, { role: 'balthazar', text: trechos.join('\n\n'), at: new Date() }]);
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
          const out = runTool(b, { byVoice });
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
      busyRef.current = false;
      setBusy(false);
    }

    if (byVoice && voiceRef.current && ultimaFala) falar(ultimaFala);
  }

  sendRef.current = send;

  return {
    messages,
    busy,
    listening,
    liveText,
    speaking,
    voiceOn,
    voiceSupported,
    send,
    startListening,
    stopAndSend,
    cancelListening,
    toggleListening,
    toggleVoice,
    stopSpeaking,
  };
}
