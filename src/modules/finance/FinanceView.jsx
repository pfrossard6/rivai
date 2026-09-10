import React from 'react';

export default function FinanceView({ state }) {
  const categories = state.finance.categories;

  if (!categories.length) {
    return <p className="empty">Nenhum limite criado ainda.</p>;
  }

  return (
    <div>
      {categories.map((c) => {
        const spent = state.finance.expenses
          .filter((e) => e.categoryId === c.id)
          .reduce((sum, e) => sum + e.amount, 0);
        const pct = c.limit > 0 ? Math.min(100, (spent / c.limit) * 100) : 0;
        const warn = c.limit > 0 && spent / c.limit >= 0.75;

        return (
          <div className="category" key={c.id}>
            <div className="category-top">
              <span className="category-name">{c.name}</span>
              <span className="category-figures">
                R$ {spent.toFixed(0)} / R$ {c.limit.toFixed(0)}
              </span>
            </div>
            <div className="bar-track">
              <div
                className={'bar-fill' + (warn ? ' warn' : '')}
                style={{ width: pct + '%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
