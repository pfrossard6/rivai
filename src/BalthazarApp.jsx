import React, { useState, useEffect } from 'react';
import { MODULES, buildInitialState, getViews } from './modules/registry.js';
import BalthazarBar from './BalthazarBar.jsx';
import './balthazar.css';

/**
 * Shell do app — continua sem conhecer nenhum módulo pelo nome.
 *
 * Desktop: sidebar à esquerda + barra do Balthazar embaixo.
 * Celular: barra de abas embaixo com o Balthazar no centro; a conversa
 *          abre em tela cheia por cima do painel.
 *
 * Dados: guardados no próprio navegador (temporário, até a Fase 3
 * com Supabase). Cada módulo é salvo e restaurado pelo seu id.
 */

const STORAGE_KEY = 'rivai:estado:v1';

/** Ícone simples por módulo, só para a barra de abas do celular. */
const ICONS = {
  finance: '◫',
  agenda: '▤',
  email: '✉',
  personal: '◇',
  travel: '✈',
};

/** Estado inicial de cada módulo, sobreposto pelo que estiver salvo. */
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

  const isMobile = useIsMobile();

  const active = MODULES.find((m) => m.id === activeId);
  const views = active ? getViews(active) : [];
  const currentView = views.find((v) => v.id === subViewId) || views[0];
  const ActiveView = currentView?.view;

  function selectModule(id) {
    setActiveId(id);
    setSubViewId(null);
    setChatOpen(false);
  }

  /* ---- guarda os dados a cada mudança ---- */
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* navegador sem armazenamento */ }
  }, [state]);

  /* ---- abertura pelo atalho: ?voz=1 abre direto a conversa ---- */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('voz') === '1' || p.get('chat') === '1') setChatOpen(true);
  }, []);

  return (
    <div className={'balthazar-app' + (isMobile ? ' is-mobile' : '')}>
      <div className="app-row">
        {!isMobile && (
          <aside className="sidebar">
            <p className="wordmark">
              Riv<span className="dot">.</span>AI
            </p>
            <p className="tagline">o rumo certo, sem ruído</p>

            <p className="nav-label">Áreas</p>
            <nav>
              {MODULES.map((m) => (
                <div
                  key={m.id}
                  className={'nav-item' + (m.id === activeId ? ' active' : '')}
                  onClick={() => selectModule(m.id)}
                >
                  {m.label}
                </div>
              ))}
            </nav>

            <div className="sidebar-footer">Pedro Frossard</div>
          </aside>
        )}

        <main className="main">
          {isMobile && (
            <div className="m-brand">
              <span className="wordmark">
                Riv<span className="dot">.</span>AI
              </span>
            </div>
          )}

          <header className="main-header">
            <span>{active?.label}</span>

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

      {/* ---------- desktop: barra fixa ---------- */}
      {!isMobile && <BalthazarBar state={state} setState={setState} mode="bar" />}

      {/* ---------- celular: conversa em tela cheia ---------- */}
      {isMobile && chatOpen && (
        <BalthazarBar
          state={state}
          setState={setState}
          mode="sheet"
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* ---------- celular: barra de abas ---------- */}
      {isMobile && (
        <nav className="tabbar">
          {MODULES.slice(0, 2).map((m) => (
            <button
              key={m.id}
              type="button"
              className={'tb' + (m.id === activeId && !chatOpen ? ' on' : '')}
              onClick={() => selectModule(m.id)}
            >
              <span className="ic">{ICONS[m.id] || '◍'}</span>
              <span className="lb">{m.label}</span>
            </button>
          ))}

          <div className="bz-tab">
            <button
              type="button"
              className={'bz-btn' + (chatOpen ? ' on' : '')}
              onClick={() => setChatOpen((o) => !o)}
              aria-label="Balthazar"
            >
              <span className="rg" />
              <span className="rg b" />
              <span className="bz-stone" />
            </button>
          </div>

          {MODULES.slice(2, 4).map((m) => (
            <button
              key={m.id}
              type="button"
              className={'tb' + (m.id === activeId && !chatOpen ? ' on' : '')}
              onClick={() => selectModule(m.id)}
            >
              <span className="ic">{ICONS[m.id] || '◍'}</span>
              <span className="lb">{m.label}</span>
            </button>
          ))}

          {/* mantém o espaçamento quando há poucos módulos */}
          {MODULES.length < 4 &&
            Array.from({ length: 4 - MODULES.length }).map((_, i) => (
              <span className="tb ghost" key={'g' + i} />
            ))}
        </nav>
      )}
    </div>
  );
}
