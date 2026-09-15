/**
 * Contas do módulo Finanças. Tudo considera o mês corrente,
 * no horário local (não em UTC), para o limite zerar a cada mês.
 */

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const pad = (n) => String(n).padStart(2, '0');

export function money(n) {
  return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',');
}

export function moneyShort(n) {
  return 'R$ ' + Math.round(Number(n || 0)).toLocaleString('pt-BR');
}

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Chave "AAAA-MM" do mês atual deslocado por `offset` meses. */
export function monthKey(offset = 0) {
  const d = new Date();
  const m = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
}

export function monthLabel(offset = 0) {
  const d = new Date();
  return MESES[new Date(d.getFullYear(), d.getMonth() + offset, 1).getMonth()];
}

export function expensesIn(state, key = monthKey()) {
  return state.finance.expenses.filter((e) => String(e.date || '').slice(0, 7) === key);
}

export function spentIn(state, categoryId, key = monthKey()) {
  return expensesIn(state, key)
    .filter((e) => e.categoryId === categoryId)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function pctOf(spent, limit) {
  return limit > 0 ? (spent / limit) * 100 : 0;
}

/** Resumo do mês: orçamento = soma dos limites. */
export function monthSummary(state) {
  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - day;

  const budget = state.finance.categories.reduce((s, c) => s + c.limit, 0);
  const spent = expensesIn(state).reduce((s, e) => s + e.amount, 0);
  const available = Math.max(0, budget - spent);
  const perDay = available / Math.max(daysLeft, 1);
  const pctSpent = Math.min(100, pctOf(spent, budget));
  const pctTime = (day / daysInMonth) * 100;

  let projection;
  if (spent <= 0) {
    projection = 'Nenhum gasto registrado neste mês ainda.';
  } else if (spent >= budget) {
    projection = 'O orçamento do mês já foi todo usado.';
  } else {
    const overDay = Math.ceil(budget / (spent / day));
    projection =
      overDay <= daysInMonth
        ? `Nesse ritmo, estoura dia ${overDay}.`
        : 'Nesse ritmo, fecha o mês dentro do orçamento.';
  }

  return {
    day, daysInMonth, daysLeft, budget, spent, available, perDay,
    pctSpent, pctTime, projection,
    monthName: MESES_LONGOS[now.getMonth()],
    monthShort: MESES[now.getMonth()],
  };
}

/** "hoje", "ontem" ou "8 set". */
export function dayLabel(iso) {
  const hoje = todayISO();
  const ontem = todayISO(new Date(Date.now() - 86400000));
  if (iso === hoje) return 'hoje';
  if (iso === ontem) return 'ontem';
  const [, m, d] = String(iso).split('-');
  return `${Number(d)} ${MESES[Number(m) - 1] || ''}`;
}
