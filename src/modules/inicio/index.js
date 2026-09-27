import InicioView from './InicioView.jsx';
import { monthSummary, todayISO } from '../finance/calc.js';

/**
 * Módulo: Início
 *
 * Não guarda estado próprio nem tem ferramentas: ele só lê o que as
 * outras áreas já sabem e junta numa tela só. É a área que cruza tudo.
 */

const inicioModule = {
  id: 'inicio',
  label: 'Início',
  enabled: true,
  view: InicioView,
  hideTitle: true,

  initialState: {},

  header: () => ({
    meta: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
    lead: null,
  }),

  systemPromptFragment: (state) => {
    const s = monthSummary(state);
    const hoje = (state.agenda?.events || []).filter((e) => e.date === todayISO()).length;
    return `INÍCIO: é a tela que junta as áreas. Hoje o Pedro tem ${hoje} ${hoje === 1 ? 'compromisso' : 'compromissos'} na agenda. ${
      s.budget ? `No mês, ${s.projection}` : 'Ele ainda não criou limites de gasto.'
    } Quando fizer sentido, ligue as áreas numa frase só (o que o gasto de hoje muda no mês, o que o compromisso de amanhã exige hoje), em vez de listar cada área separada.`;
  },
};

export default inicioModule;
