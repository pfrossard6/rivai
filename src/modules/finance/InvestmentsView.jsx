import React from 'react';

/**
 * Sub-view: Investimentos (dentro do módulo Finanças).
 *
 * Só leitura — cotações reais entram na Fase 5.
 */
export default function InvestmentsView({ state }) {
  const rates = state.finance.rates;

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
