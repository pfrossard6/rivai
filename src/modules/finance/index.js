import FinanceView from './FinanceView.jsx';
import InvestmentsView from './InvestmentsView.jsx';

/**
 * Módulo: Finanças
 *
 * Os handlers devolvem { text, receipt }. O texto vai para a API
 * (é o que o Balthazar "sabe" que aconteceu); o recibo é desenhado
 * dentro da mensagem, com a barra do limite.
 */

const INVESTIMENTOS =
  'INVESTIMENTOS: a aba ainda não mostra cotações. Se o Pedro perguntar sobre mercado ou cotações, pesquise na internet e responda com os números atuais, deixando claro que não é recomendação de investimento.';

function money(n) {
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function titleCase(s) {
  return s.trim().charAt(0).toUpperCase() + s.trim().slice(1);
}

function spentIn(state, categoryId) {
  return state.finance.expenses
    .filter((e) => e.categoryId === categoryId)
    .reduce((sum, e) => sum + e.amount, 0);
}

function receiptFor(cat, spent) {
  const pct = cat.limit > 0 ? (spent / cat.limit) * 100 : 0;
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

  tools: [
    {
      name: 'log_expense',
      description: 'Registra um gasto numa categoria de limite já existente.',
      input_schema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Nome de uma categoria já cadastrada' },
          amount: { type: 'number', description: 'Valor gasto em reais' },
          note: { type: 'string', description: 'Descrição curta opcional' },
        },
        required: ['category', 'amount'],
      },
    },
    {
      name: 'create_category',
      description: 'Cria uma nova categoria de limite de gasto.',
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
    log_expense: (input, state, setState) => {
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
              date: new Date().toISOString().slice(0, 10),
            },
          ],
        },
      }));

      const total = spentIn(state, cat.id) + amount;
      return {
        text: `Anotado: ${money(amount)} em "${cat.name}". Já foram ${money(total)} de ${money(cat.limit)} — restam ${money(cat.limit - total)}.`,
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
        text: `Criei a categoria "${name}" com limite de ${money(limit)}.`,
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
        return `- ${c.name}: limite ${money(c.limit)}, gasto ${money(spent)}, restam ${money(c.limit - spent)}`;
      })
      .join('\n');
    return `FINANÇAS — categorias e limites atuais:\n${lines}\n\nAo registrar um gasto, escolha a categoria existente mais próxima. Se nenhuma servir, pergunte antes de criar uma nova.\n\n${INVESTIMENTOS}`;
  },
};

export default financeModule;
