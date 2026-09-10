import React from 'react';

/**
 * Módulo: Investimentos
 *
 * Exemplo de módulo SEM ferramentas — só leitura. Mostra que o padrão
 * aguenta módulos simples sem obrigar tool calling.
 * Cotações reais entram na Fase 5.
 */

function InvestmentsView({ state }) {
  const rates = state.investments.rates;

  if (!rates.length) {
    return <p className="empty">Cotações reais entram na Fase 5.</p>;
  }

  return (
    <div>
      {rates.map((r) => (
        <div className="rate-row" key={r.name}>
          <span>{r.name}</span>
          <span className="rate-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

const investmentsModule = {
  id: 'investments',
  label: 'Investimentos',
  enabled: true,
  view: InvestmentsView,

  initialState: {
    rates: [],
  },

  tools: [],
  handlers: {},

  systemPromptFragment: () =>
    'INVESTIMENTOS: cotações ainda não conectadas. Se o Pedro perguntar sobre mercado, responda com conhecimento geral e deixe claro que não é recomendação financeira formal.',
};

export default investmentsModule;
