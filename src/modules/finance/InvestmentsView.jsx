import React from 'react';

/**
 * Sub-view: Investimentos (dentro do módulo Finanças).
 *
 * Só leitura — cotações na tela entram na Fase 5. Até lá,
 * o Balthazar responde cotações pesquisando na internet.
 */
export default function InvestmentsView({ state }) {
  const rates = state.finance.rates;

  if (!rates.length) {
    return (
      <div className="wrap">
        <p className="empty">
          As cotações aparecem aqui na Fase 5. Por enquanto, pergunte ao Balthazar: "como está o dólar hoje?".
        </p>
      </div>
    );
  }

  return (
    <div className="wrap">
      {rates.map((r) => (
        <div className="rate-row" key={r.name}>
          <span>{r.name}</span>
          <span className="rate-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
