import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MODULES, buildInitialState, getViews, getHeader, getNavBadge, getHudCards,
} from './modules/registry.js';
import useBalthazar, { textoLimpo } from './balthazar/useBalthazar.js';
import { Stone } from './balthazar/Marks.jsx';
import VoiceMode from './balthazar/VoiceMode.jsx';
import ChatSheet from './balthazar/ChatSheet.jsx';
import Splash from './balthazar/Splash.jsx';
import Tour from './balthazar/Tour.jsx';
import './balthazar.css';

/**
 * Shell do app — continua sem conhecer nenhum módulo pelo nome.
 *
 * Desktop: áreas à esquerda, painel à direita, pedra no canto inferior
 *          direito. A pedra abre o modo voz (tela escura) já ouvindo.
 * Celular: barra de abas com a pedra no centro. A pedra abre a conversa;
 *          o microfone da conversa abre o modo voz.
 *
 * Abertura: uma vez por sessão. Tutorial: na primeira vez (ou ?tutorial=1).
 * Dados: guardados no navegador até a Fase 3 (Supabase).
 */

const STORAGE_KEY = 'rivai:estado:v1';
const TOUR_KEY = 'rivai:tutorial:v1';
const SPLASH_KEY = 'rivai:abertura';

const ICONS = {
  finance: '◫',
  agenda: '▤',
  email: '✉',
  personal: '◇',
  travel: '✈',
};

function carregarEstado() {
  const base = buildInitialState();
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    if (!bruto) return base;
    const salvo = JSON.parse(bruto);
    Object.keys(base).forEach((id) => {
      if (salvo && salvo[id] && typeof salvo[id] === 'object') {
        base[id] = { ...base[id], ...salvo[id] };
      }
    });
    return base;
  } catch (e) {
    return base;
  }
}

function lerFlag(storage, key) {
  try {
    return Boolean(window[storage].getItem(key));
  } catch (e) {
    return true;
  }
}

function gravarFlag(storage, key) {
  try {
    window[storage].setItem(key, '1');
  } catch (e) { /* navegador sem armazenamento */ }
}

function pedeTutorial() {
  const p = new URLSearchParams(window.location.search);
  return p.get('tutorial') === '1' || !lerFlag('localStorage', TOUR_KEY);
}

function useIsMobile() {
  const [is, setIs] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 760px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const on = (e) => setIs(e.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on);
    };
  }, []);
  return is;
}

export default function BalthazarApp() {
  const [activeId, setActiveId] = useState(MODULES[0]?.id);
  const [subViewId, setSubViewId] = useState(null);
  const [state, setState] = useState(carregarEstado);
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [splash, setSplash] = useState(() => !lerFlag('sessionStorage', SPLASH_KEY));
  const [tour, setTour] = useState(false);
  const [toast, setToast] = useState(null);

  const isMobile = useIsMobile();
  const api = useBalthazar(state, setState);

  const active = MODULES.find((m) => m.id === activeId);
  const views = active ? getViews(active) : [];
  const currentView = views.find((v) => v.id === subViewId) || views[0];
  const ActiveView = currentView?.view;
  const header = getHeader(active, state);
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  /* ---- dados: guarda a cada mudança ---- */
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* navegador sem armazenamento */ }
  }, [state]);

  /* ---- atalho: ?voz=1 abre o modo voz, ?chat=1 abre a conversa ---- */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('voz') === '1') setVoiceOpen(true);
    else if (p.get('chat') === '1') setChatOpen(true);
  }, []);

  /* ---- abertura → tutorial ---- */
  const fimAbertura = useCallback(() => {
    gravarFlag('sessionStorage', SPLASH_KEY);
    setSplash(false);
  }, []);

  const fimTutorial = useCallback(() => {
    gravarFlag('localStorage', TOUR_KEY);
    setTour(false);
  }, []);

  useEffect(() => {
    if (splash) return undefined;
    if (!pedeTutorial()) return undefined;
    const t = setTimeout(() => setTour(true), 400);
    return () => clearTimeout(t);
  }, [splash]);

  /* ---- aviso discreto quando a resposta chega com as telas fechadas ---- */
  const contagem = useRef(api.messages.length);
  useEffect(() => {
    const n = api.messages.length;
    if (n > contagem.current) {
      const m = api.messages[n - 1];
      if (m.role === 'balthazar' && !voiceOpen && !chatOpen) setToast(m);
    }
    contagem.current = n;
  }, [api.messages, voiceOpen, chatOpen]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---- navegação ---- */
  function selectModule(id) {
    setActiveId(id);
    setSubViewId(null);
    setChatOpen(false);
  }

  /** Abre o modo voz; no mesmo toque já começa a ouvir. */
  function abrirVoz() {
    setChatOpen(false);
    setVoiceOpen(true);
    api.startListening();
  }

  const fecharVoz = useCallback(() => {
    api.cancelListening();
    setVoiceOpen(false);
  }, [api]);

  function abrirConversaDoVoz() {
    api.cancelListening();
    setVoiceOpen(false);
    setChatOpen(true);
  }

  const cards = voiceOpen ? getHudCards(state) : [];

  const tabButton = (m) => (
    <button
      key={m.id}
      type="button"
      className={'tb' + (m.id === activeId && !chatOpen ? ' on' : '')}
      onClick={() => selectModule(m.id)}
    >
      <span className="ic">{ICONS[m.id] || '◍'}</span>
      <span className="lb">{m.label}</span>
    </button>
  );

  return (
    <div className={'balthazar-app' + (isMobile ? ' is-mobile' : '')}>
      <div className="app-row">
        {/* ================= áreas (desktop) ================= */}
        {!isMobile && (
          <aside className="sidebar">
            <p className="wordmark">
              Riv<span className="dot">.</span>AI
            </p>
            <p className="tagline">o rumo certo, sem ruído</p>

            <p className="nav-label">Áreas</p>
            <nav className="nav" data-tour="nav">
              {MODULES.map((m) => {
                const badge = getNavBadge(m, state);
                return (
                  <div
                    key={m.id}
                    className={'nav-item' + (m.id === activeId ? ' active' : '')}
                    onClick={() => selectModule(m.id)}
                  >
                    {m.label}
                    {badge && <span className="tag">{badge}</span>}
                  </div>
                );
              })}
            </nav>

            <div className="sidebar-footer">
              Pedro Frossard
              <br />
              <span className="soft">{mes}</span>
              <button className="link" type="button" onClick={() => setTour(true)}>
                rever tutorial
              </button>
            </div>
          </aside>
        )}

        {/* ================= painel ================= */}
        <main className="main">
          {isMobile && (
            <div className="m-brand">
              <span className="wordmark">
                Riv<span className="dot">.</span>AI
              </span>
              <span className="m-month">{mes.split(' ')[0]}</span>
            </div>
          )}

          <header className="main-header">
            <div className="hd-row">
              <h2>{active?.label}</h2>
              {header.meta && !isMobile && <span className="hd-meta">{header.meta}</span>}
            </div>
            {header.lead && <p className="hd-lead">{header.lead}</p>}

            {views.length > 1 && (
              <div className="sub-tabs">
                {views.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={'sub-tab' + (v.id === currentView.id ? ' active' : '')}
                    onClick={() => setSubViewId(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </header>

          <div className="main-body">
            {ActiveView && <ActiveView state={state} setState={setState} />}
          </div>
        </main>
      </div>

      {/* ================= pedra (desktop) ================= */}
      {!isMobile && !voiceOpen && (
        <button className="orb" type="button" onClick={abrirVoz} aria-label="Falar com o Balthazar" data-tour="orb">
          <Stone rings={3} />
        </button>
      )}

      {/* ================= aviso ================= */}
      {toast && !voiceOpen && !chatOpen && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          <div className="k">Balthazar</div>
          <p>{textoLimpo(toast.text)}</p>
          {toast.receipt && (
            <div className="tr">
              <div className="fl" style={{ width: Math.min(100, toast.receipt.pct || 0) + '%' }} />
            </div>
          )}
          <div className="fade">some em 6s · fica no histórico</div>
        </div>
      )}

      {/* ================= conversa (celular) ================= */}
      {isMobile && chatOpen && (
        <ChatSheet
          api={api}
          context={active?.label}
          onClose={() => setChatOpen(false)}
          onVoice={abrirVoz}
        />
      )}

      {/* ================= barra de abas (celular) ================= */}
      {isMobile && (
        <nav className="tabbar" data-tour="nav">
          {MODULES.slice(0, 2).map(tabButton)}

          <div className="bz-tab">
            <button
              type="button"
              className={'bz-btn' + (chatOpen ? ' on' : '')}
              onClick={() => setChatOpen((o) => !o)}
              aria-label="Balthazar"
              data-tour="orb"
            >
              <span className="rg" />
              <span className="rg b" />
              <span className="bz-stone" />
            </button>
          </div>

          {MODULES.slice(2, 4).map(tabButton)}

          {MODULES.length < 4 &&
            Array.from({ length: 4 - MODULES.length }).map((_, i) => (
              <span className="tb ghost" key={'g' + i} />
            ))}
        </nav>
      )}

      {/* ================= modo voz ================= */}
      {voiceOpen && (
        <VoiceMode
          api={api}
          cards={cards}
          mobile={isMobile}
          onClose={fecharVoz}
          onOpenChat={abrirConversaDoVoz}
        />
      )}

      {tour && !splash && <Tour onDone={fimTutorial} />}
      {splash && <Splash onDone={fimAbertura} />}
    </div>
  );
}
