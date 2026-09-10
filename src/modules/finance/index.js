import FinanceView from './FinanceView.jsx';
import InvestmentsView from './InvestmentsView.jsx';

/**
 * Módulo: Finanças
 *
 * Cada módulo declara:
 *  - view OU subViews      a aba (ou as sub-abas, quando a área tem mais de um espaço)
 *  - tools                 o que o Balthazar pode fazer aqui
 *  - handlers              o que roda quando ele chama cada tool
 *  - systemPromptFragment  o que o Balthazar sabe sobre esta área
 *
 * Este é o módulo de referência para sub-views: a sidebar mostra só
 * "Finanças", e Gastos / Investimentos viram abas dentro dela.
 * O systemPromptFragment continua sendo UM por módulo — a divisão em
 * sub-abas é só de navegação, o Balthazar não precisa saber dela.
 */

function money(n) {
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function spentIn(state, categoryId) {
  return state.finance.expenses
    .filter((e) => e.categoryId === categoryId)
    .reduce((sum, e) => sum + e.amount, 0);
}

const financeModule = {
  id: 'finance',
  label: 'Finanças',
  enabled: true,

  // Sub-abas desta área. A primeira é a que abre por padrão.
  // Um módulo sem sub-abas usa `view:` no lugar (ver agenda).
  subViews: [
    { id: 'gastos', label: 'Gastos', view: FinanceView },
    { id: 'investimentos', label: 'Investimentos', view: InvestmentsView },
  ],

  initialState: {
    categories: [],
    expenses: [],
    rates: [], // Fase 5
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
        return `Não achei a categoria "${input.category}". Quer que eu crie?`;
      }
      const amount = Number(input.amount);
      if (!isFinite(amount)) return 'Não entendi o valor.';

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
      return `Anotado: ${money(amount)} em "${cat.name}". Já foram ${money(total)} de ${money(cat.limit)} — restam ${money(cat.limit - total)}.`;
    },

    create_category: (input, state, setState) => {
      const name = String(input.name || '').trim();
      const limit = Number(input.limit);
      if (!name || !isFinite(limit)) return 'Preciso do nome e do limite.';

      setState((prev) => ({
        ...prev,
        finance: {
          ...prev.finance,
          categories: [
            ...prev.finance.categories,
            { id: crypto.randomUUID(), name, limit },
          ],
        },
      }));

      return `Criei a categoria "${name}" com limite de ${money(limit)}.`;
    },
  },

  systemPromptFragment: (state) => {
    const cats = state.finance.categories;
    if (!cats.length) {
      return 'FINANÇAS: nenhuma categoria de limite cadastrada ainda. Se o Pedro mencionar um gasto, ofereça criar a categoria com create_category.';
    }
    const lines = cats
      .map((c) => {
        const spent = spentIn(state, c.id);
        return `- ${c.name}: limite ${money(c.limit)}, gasto ${money(spent)}, restam ${money(c.limit - spent)}`;
      })
      .join('\n');
    return `FINANÇAS — categorias e limites atuais:\n${lines}\n\nAo registrar um gasto, escolha a categoria existente mais próxima. Se nenhuma servir, pergunte antes de criar uma nova.\n\nINVESTIMENTOS: cotações ainda não conectadas. Se o Pedro perguntar sobre mercado, responda com conhecimento geral e deixe claro que não é recomendação financeira formal.`;
  },
};

export default financeModule;
