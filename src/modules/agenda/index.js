import AgendaView from './AgendaView.jsx';

/**
 * Módulo: Agenda
 *
 * Na Fase 4 este módulo troca os handlers locais pelas ferramentas reais
 * do Google Agenda via MCP. A forma do módulo não muda — só o miolo dos
 * handlers. É exatamente por isso que vale a pena a estrutura.
 */

const pad = (n) => String(n).padStart(2, '0');
function isoLocal(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function eventsOn(state, iso) {
  return state.agenda.events
    .filter((e) => e.date === iso)
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

const agendaModule = {
  id: 'agenda',
  label: 'Agenda',
  enabled: true,
  view: AgendaView,

  initialState: {
    events: [],
  },

  header: (state) => {
    const hoje = eventsOn(state, isoLocal(0)).length;
    const dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return {
      meta: dia,
      lead: hoje ? `${hoje} ${hoje === 1 ? 'compromisso' : 'compromissos'} hoje` : 'Nada marcado para hoje.',
    };
  },

  hud: (state) => {
    const hoje = eventsOn(state, isoLocal(0));
    const amanha = eventsOn(state, isoLocal(1));
    const lista = hoje.length ? hoje : amanha;
    if (!lista.length) return [];
    return [
      {
        k: hoje.length ? 'Hoje' : 'Amanhã',
        rows: lista.slice(0, 3).map((e) => [e.time, e.title]),
      },
    ];
  },

  tools: [
    {
      name: 'list_events',
      description: 'Lista os compromissos do Pedro num dia específico.',
      input_schema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Data no formato AAAA-MM-DD' },
        },
        required: ['date'],
      },
    },
    {
      name: 'create_event',
      description: 'Cria um compromisso na agenda do Pedro.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          date: { type: 'string', description: 'AAAA-MM-DD' },
          time: { type: 'string', description: 'HH:MM' },
          location: { type: 'string' },
        },
        required: ['title', 'date', 'time'],
      },
    },
  ],

  handlers: {
    list_events: (input, state) => {
      const found = eventsOn(state, input.date);
      if (!found.length) return `Nada marcado em ${input.date}.`;
      return found.map((e) => `${e.time} — ${e.title}`).join('\n');
    },

    create_event: (input, state, setState) => {
      setState((prev) => ({
        ...prev,
        agenda: {
          ...prev.agenda,
          events: [
            ...prev.agenda.events,
            {
              id: crypto.randomUUID(),
              title: input.title,
              date: input.date,
              time: input.time,
              location: input.location || '',
            },
          ],
        },
      }));
      return `Marquei "${input.title}" em ${input.date} às ${input.time}.`;
    },
  },

  systemPromptFragment: (state) => {
    const count = state.agenda.events.length;
    return `AGENDA: ${count} evento(s) salvo(s) no app. Use list_events para consultar e create_event para marcar. Antes de apagar ou remarcar qualquer compromisso, confirme com o Pedro.`;
  },
};

export default agendaModule;
