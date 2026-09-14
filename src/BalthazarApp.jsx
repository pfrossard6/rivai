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
 */

/** Ícone simples por módulo, só para a barra de abas do celular. */
const ICONS = {
  finance: '◫',
  agenda: '▤',
  email: '✉',
  personal: '◇',
  travel: '✈',
};

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

/** Marca do Balthazar — pedra na água. */
function Mark({ size = 15, onDeep = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle
        cx="24" cy="24" r="8" fill="none"
        stroke={onDeep ? '#E8A970' : 'var(--bz-ember)'}
        strokeWidth="3.2"
      />
      <circle
        cx="24" cy="24" r="17" fill="none"
        stroke={onDeep ? '#8FC2D1' : 'var(--accent)'}
        strokeWidth="2.2"
        opacity={onDeep ? '.75' : '.55'}
      />
    </svg>
  );
}

export default function BalthazarApp() {
  const [activeId, setActiveId] = useState(MODULES[0]?.id);
  const [subViewId, setSubViewId] = useState(null);
  const [state, setState] = useState(buildInitialState);
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

  /* ---- abertura pelo atalho: ?voz=1 abre direto o modo de fala ---- */
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
              <Mark size={19} onDeep />
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
