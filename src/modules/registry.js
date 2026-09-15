import finance from './finance/index.js';
import agenda from './agenda/index.js';

/**
 * Registro de módulos. O shell só conversa com estas funções.
 *
 * Um módulo pode declarar, além de view/subViews, tools e handlers:
 *   header(state)   → { meta, lead }   linha de apoio no topo do painel
 *   navBadge(state) → texto curto       selo ao lado do nome na lista de áreas
 *   hud(state)      → [cartões]         cartões mostrados no modo voz
 */

const ALL_MODULES = [finance, agenda];

export const MODULES = ALL_MODULES.filter((m) => m.enabled);

export function getViews(module) {
  if (module.subViews?.length) return module.subViews;
  if (module.view) return [{ id: module.id, label: module.label, view: module.view }];
  return [];
}

export function buildInitialState() {
  const state = {};
  MODULES.forEach((m) => {
    state[m.id] = m.initialState;
  });
  return state;
}

export function getAllTools() {
  return MODULES.flatMap((m) => m.tools || []);
}

export function getToolHandler(toolName) {
  const owner = MODULES.find((m) => m.tools?.some((t) => t.name === toolName));
  return owner ? owner.handlers[toolName] : null;
}

export function getHeader(module, state) {
  return (module && module.header && module.header(state)) || {};
}

export function getNavBadge(module, state) {
  return module && module.navBadge ? module.navBadge(state) : null;
}

export function getHudCards(state) {
  return MODULES.flatMap((m) => (m.hud ? m.hud(state) || [] : []));
}

export function buildSystemPrompt(state) {
  const now = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const base = `Você é o Balthazar, assessor pessoal do Pedro. Hoje é ${now}, fuso America/Sao_Paulo. O Pedro mora em Vitória, ES.

Tom: direto, calmo, sem entusiasmo forçado. Sem emoji. Português do Brasil.
Antes de qualquer ação destrutiva (apagar, remarcar), confirme.

Você conversa sobre qualquer assunto, não só sobre as áreas do app. Quando a resposta depender de algo atual (notícias, cotações, preços, clima, resultados de jogos, horários, quem ocupa um cargo), pesquise na internet antes de responder e cite a fonte em poucas palavras. Para conhecimento estável (conceitos, história, explicações), responda direto, sem pesquisar.
Por padrão, respostas curtas. Só se estenda se o Pedro pedir detalhes.`;

  const fragments = MODULES.map((m) => m.systemPromptFragment(state)).join('\n\n');

  return `${base}\n\n${fragments}`;
}
