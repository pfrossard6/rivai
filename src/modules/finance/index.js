import FinanceView from './FinanceView.jsx';
import InvestmentsView from './InvestmentsView.jsx';
import {
  money, moneyShort, todayISO, spentIn, pctOf, monthSummary, expensesIn,
} from './calc.js';

/**
 * Módulo: Finanças
 *
 * Os handlers devolvem { text, receipt }. O texto vai para a API
 * (é o que o Balthazar "sabe" que aconteceu); o recibo é desenhado
 * dentro da mensagem, com a barra do limite.
 *
 * Limites valem por mês: o gasto considerado é só o do mês corrente.
 */

const INVESTIMENTOS =
  'INVESTIMENTOS: a aba ainda não mostra cotações. Se o Pedro perguntar sobre mercado ou cotações, pesquise na internet e responda com os números atuais, deixando claro que não é recomendação de investimento.';

function titleCase(s) {
  return s.trim().charAt(0).toUpperCase() + s.trim().slice(1);
}

function receiptFor(cat, spent) {
  const pct = pctOf(spent, cat.limit);
  return {
    label: `${cat.name} · ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`,
    left: `${money(spent)} de ${money(cat.limit)}`,
    right: `restam ${money(Math.max(0, cat.limit - spent))}`,
    pct,
    warn: pct >= 75,
  };
}

const financeModule = {
  id: 'finance',
  label: 'Finanças',
  enabled: true,

  subViews: [
    { id: 'gastos', label: 'Gastos', view: FinanceView },
    { id: 'investimentos', label: 'Investimentos', view: InvestmentsView },
  ],

  initialState: {
    categories: [],
    expenses: [],
    rates: [],
  },

  /* ---- topo do painel ---- */
  header: (state) => {
    const s = monthSummary(state);
    const n = expensesIn(state).length;
    const meta = `${s.monthName} · ${n} ${n === 1 ? 'lançamento' : 'lançamentos'}`;
    if (!s.budget) return { meta, lead: 'Nenhum limite definido para este mês.' };
    return {
      meta,
      lead: `${moneyShort(s.spent)} de ${moneyShort(s.budget)} · ${s.daysLeft} ${s.daysLeft === 1 ? 'dia restante' : 'dias restantes'}`,
    };
  },

  /* ---- selo na lista de áreas: o limite mais apertado, a partir de 75% ---- */
  navBadge: (state) => {
    const pcts = state.finance.categories.map((c) => pctOf(spentIn(state, c.id), c.limit));
    const max = pcts.length ? Math.max(...pcts) : 0;
    return max >= 75 ? `${Math.round(max)}%` : null;
  },

  /* ---- cartões do modo voz ---- */
  hud: (state) => {
    const cats = state.finance.categories;
    if (!cats.length) return [];
    const s = monthSummary(state);
    const doMes = expensesIn(state);
    const ultimo = doMes[doMes.length - 1];

    const comPct = cats.map((c) => {
      const spent = spentIn(state, c.id);
      return { c, spent, pct: pctOf(spent, c.limit) };
    });
    const foco =
      (ultimo && comPct.find((x) => x.c.id === ultimo.categoryId)) ||
      [...comPct].sort((a, b) => b.pct - a.pct)[0];

    const cards = [
      {
        k: `${foco.c.name} · ${s.monthName}`,
        v: moneyShort(foco.spent),
        small: `de ${moneyShort(foco.c.limit)}`,
        pct: foco.pct,
        s: `restam ${moneyShort(Math.max(0, foco.c.limit - foco.spent))} · ${s.daysLeft} dias`,
      },
    ];

    const alerta = comPct.filter((x) => x.c.id !== foco.c.id && x.pct >= 90).sort((a, b) => b.pct - a.pct)[0];
    if (alerta) {
      cards.push({
        k: 'Atenção',
        v: `${alerta.c.name} ${Math.round(alerta.pct)}%`,
        pct: alerta.pct,
        warn: true,
        s: 'perto do limite do mês',
      });
    }
    return cards;
  },

  tools: [
    {
      name: 'log_expense',
      description: 'Registra um gasto numa categoria de limite já existente.',
      input_schema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Nome de uma categoria já cadastrada' },
          amount: { type: 'number', description: 'Valor gasto em reais' },
          note: { type: 'string', description: 'Descrição curta, ex.: "Almoço", "Uber centro"' },
        },
        required: ['category', 'amount'],
      },
    },
    {
      name: 'create_category',
      description: 'Cria uma nova categoria de limite mensal de gasto.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          limit: { type: 'number', description: 'Limite mensal em reais' },
        },
        required: ['name', 'limit'],
      },
    },
  ],

  handlers: {
    log_expense: (input, state, setState, ctx) => {
      const cat = state.finance.categories.find(
        (c) => c.name.toLowerCase() === String(input.category || '').toLowerCase()
      );
      if (!cat) {
        return { text: `Não achei a categoria "${input.category}". Quer que eu crie?` };
      }
      const amount = Number(input.amount);
      if (!isFinite(amount)) return { text: 'Não entendi o valor.' };

      setState((prev) => ({
        ...prev,
        finance: {
          ...prev.finance,
          expenses: [
            ...prev.finance.expenses,
            {
              id: crypto.randomUUID(),
              categoryId: cat.id,
              amount,
              note: input.note || '',
              date: todayISO(),
              viaVoz: Boolean(ctx && ctx.byVoice),
            },
          ],
        },
      }));

      const total = spentIn(state, cat.id) + amount;
      return {
        text: `Anotado: ${money(amount)} em "${cat.name}". Já foram ${money(total)} de ${money(cat.limit)} neste mês — restam ${money(cat.limit - total)}.`,
        receipt: receiptFor(cat, total),
      };
    },

    create_category: (input, state, setState) => {
      const name = titleCase(String(input.name || ''));
      const limit = Number(input.limit);
      if (!name || !isFinite(limit)) return { text: 'Preciso do nome e do limite.' };

      setState((prev) => ({
        ...prev,
        finance: {
          ...prev.finance,
          categories: [...prev.finance.categories, { id: crypto.randomUUID(), name, limit }],
        },
      }));

      return {
        text: `Criei a categoria "${name}" com limite mensal de ${money(limit)}.`,
        receipt: receiptFor({ name, limit }, 0),
      };
    },
  },

  systemPromptFragment: (state) => {
    const cats = state.finance.categories;
    if (!cats.length) {
      return `FINANÇAS: nenhuma categoria de limite cadastrada ainda. Se o Pedro mencionar um gasto, ofereça criar a categoria com create_category.\n\n${INVESTIMENTOS}`;
    }
    const lines = cats
      .map((c) => {
        const spent = spentIn(state, c.id);
        return `- ${c.name}: limite mensal ${money(c.limit)}, gasto neste mês ${money(spent)}, restam ${money(c.limit - spent)}`;
      })
      .join('\n');
    return `FINANÇAS — categorias e limites do mês atual:\n${lines}\n\nAo registrar um gasto, escolha a categoria existente mais próxima e preencha note com uma descrição curta. Se nenhuma categoria servir, pergunte antes de criar uma nova.\n\n${INVESTIMENTOS}`;
  },
};

export default financeModule;
