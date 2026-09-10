import React, { useState } from 'react';
import { MODULES, buildInitialState, getViews } from './modules/registry.js';
import BalthazarBar from './BalthazarBar.jsx';
import './balthazar.css';

/**
 * Shell do app. Continua sem mencionar nenhum módulo pelo nome —
 * só percorre o registry.
 *
 * Módulos com `subViews` ganham uma fileira de abas abaixo do título.
 * Módulos com `view` única não mostram fileira nenhuma.
 */
export default function BalthazarApp() {
  const [activeId, setActiveId] = useState(MODULES[0]?.id);
  const [subViewId, setSubViewId] = useState(null);
  const [state, setState] = useState(buildInitialState);

  const active = MODULES.find((m) => m.id === activeId);
  const views = active ? getViews(active) : [];

  // Sem sub-view escolhida, abre a primeira da área.
  const currentView = views.find((v) => v.id === subViewId) || views[0];
  const ActiveView = currentView?.view;

  function selectModule(id) {
    setActiveId(id);
    setSubViewId(null); // volta pra primeira aba ao trocar de área
  }

  return (
    <div className="balthazar-app">
      <div className="app-row">
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

        <main className="main">
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

      <BalthazarBar state={state} setState={setState} />
    </div>
  );
}
