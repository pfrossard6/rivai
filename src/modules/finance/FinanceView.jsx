import React from 'react';
import {
  money, moneyShort, spentIn, pctOf, monthSummary, expensesIn,
  monthKey, monthLabel, dayLabel,
} from './calc.js';

/**
 * Finanças · Gastos
 * Ordem do mockup: ritmo do mês → limites → quatro meses → últimos lançamentos.
 */
export default function FinanceView({ state }) {
  const cats = state.finance.categories;

  if (!cats.length) {
    return (
      <div className="wrap">
        <p className="empty">
          Nenhum limite criado ainda. Fala com o Balthazar: "cria um limite de comida de 600 reais".
        </p>
      </div>
    );
  }

  const s = monthSummary(state);
  const doMes = expensesIn(state);
  const nomeCat = (id) => (cats.find((c) => c.id === id) || {}).name || 'Outros';

  /* quatro meses */
  const meses = [-3, -2, -1, 0].map((off) => ({
    off,
    label: monthLabel(off),
    total: expensesIn(state, monthKey(off)).reduce((t, e) => t + e.amount, 0),
  }));
  const topo = Math.max(s.budget, ...meses.map((m) => m.total), 1);

  /* últimos lançamentos: mais recentes primeiro */
  const ultimos = [...state.finance.expenses]
    .map((e, i) => ({ ...e, i }))
    .sort((a, b) => (a.date === b.date ? b.i - a.i : a.date < b.date ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="wrap">
      {/* ---- ritmo ---- */}
      <div className="pace" data-tour="pace">
        <div className="pace-t">
          <div>
            <div className="k">Sobra por dia até {s.daysInMonth} de {s.monthName}</div>
            <div className="big">
              {money(s.perDay)}
              <small>por dia</small>
            </div>
          </div>
          <span className="sd">{moneyShort(s.available)} disponíveis</span>
        </div>
        <div className="line">
          <div className="dn" style={{ width: s.pctSpent + '%' }} />
          <div className="td" style={{ left: s.pctTime + '%' }} />
        </div>
        <div className="line-x">
          <span>1 {s.monthShort}</span>
          <span>hoje · dia {s.day}</span>
          <span>{s.daysInMonth} {s.monthShort}</span>
        </div>
        <p>
          {Math.round(s.pctSpent)}% do orçamento em {Math.round(s.pctTime)}% do mês.{' '}
          <b className={s.spent >= s.budget ? 'bad' : ''}>{s.projection}</b>
        </p>
      </div>

      {/* ---- limites ---- */}
      <p className="lbl">Limites</p>
      <div data-tour="cats">
        {cats.map((c) => {
          const spent = spentIn(state, c.id);
          const pct = pctOf(spent, c.limit);
          const lanc = doMes.filter((e) => e.categoryId === c.id);
          const maior = lanc.reduce((m, e) => (!m || e.amount > m.amount ? e : m), null);
          const antes = spentIn(state, c.id, monthKey(-1));

          let cls = 'fl';
          if (pct >= 75) cls += ' w';
          else if (pct < 25) cls += ' g';

          let comparacao = null;
          if (antes > 0) {
            const delta = Math.round(((spent - antes) / antes) * 100);
            if (delta > 0) comparacao = <span className="up">↑ {delta}% vs {monthLabel(-1)}</span>;
            else if (delta < 0) comparacao = <span className="dw">↓ {Math.abs(delta)}% vs {monthLabel(-1)}</span>;
            else comparacao = <span>= igual a {monthLabel(-1)}</span>;
          }

          return (
            <div className="cat" key={c.id}>
              <div className="ct">
                <div>
                  <div className="cn">{c.name}</div>
                  <div className="cs">
                    {lanc.length
                      ? `${lanc.length} ${lanc.length === 1 ? 'lançamento' : 'lançamentos'} · maior: ${(maior.note || 'sem descrição').toLowerCase()} ${moneyShort(maior.amount)}`
                      : 'nenhum lançamento este mês'}
                  </div>
                </div>
                <div className="cf">
                  <b>{moneyShort(spent)}</b> <span className="d">/ {moneyShort(c.limit)}</span>
                </div>
              </div>
              <div className="tr">
                <div className={cls} style={{ width: Math.min(100, pct) + '%' }} />
              </div>
              <div className="dt">
                {comparacao}
                {spent > 0 && <span>média {moneyShort(spent / s.day)}/dia</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- quatro meses ---- */}
      <p className="lbl">Quatro meses</p>
      <div className="cmp">
        {meses.map((m) => (
          <div className="col" key={m.off}>
            <div
              className={'b' + (m.off === 0 ? ' now' : '')}
              style={{ height: Math.max(2, (m.total / topo) * 100) + '%' }}
              title={moneyShort(m.total)}
            />
          </div>
        ))}
      </div>
      <div className="cmp-x">
        {meses.map((m) => (
          <span key={m.off}>{m.off === 0 ? `${m.label} · em curso` : m.label}</span>
        ))}
      </div>

      {/* ---- últimos lançamentos ---- */}
      <p className="lbl">Últimos lançamentos</p>
      <div data-tour="hist">
        {ultimos.length === 0 && <p className="empty">Nenhum gasto registrado ainda.</p>}
        {ultimos.map((e) => (
          <div className="row" key={e.id}>
            <span className="d">{dayLabel(e.date)}</span>
            <div>
              <div className="t">
                {e.note || nomeCat(e.categoryId)}
                {e.viaVoz && <span className="mini">por voz</span>}
              </div>
              <div className="s">{nomeCat(e.categoryId)}</div>
            </div>
            <span className="v">{money(e.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
