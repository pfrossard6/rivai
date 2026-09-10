import finance from './finance/index.js';
import agenda from './agenda/index.js';

/**
 * ÚNICO lugar que precisa mudar para adicionar um módulo novo.
 *
 * Para adicionar E-mail depois:
 *   1. criar /modules/email/index.js seguindo o mesmo formato
 *   2. importar aqui
 *   3. adicionar na lista abaixo
 *
 * Nenhum arquivo existente precisa ser tocado.
 */
const ALL_MODULES = [finance, agenda];

export const MODULES = ALL_MODULES.filter((m) => m.enabled);

/**
 * Normaliza os dois formatos de módulo.
 *
 * Um módulo pode declarar `view` (uma tela só) ou `subViews` (várias abas
 * dentro da mesma área). Quem consome não precisa saber a diferença: essa
 * função sempre devolve uma lista.
 */
export function getViews(module) {
  if (module.subViews?.length) return module.subViews;
  if (module.view) return [{ id: module.id, label: module.label, view: module.view }];
  return [];
}

/** Estado inicial montado a partir do que cada módulo declara. */
export function buildInitialState() {
  const state = {};
  MODULES.forEach((m) => {
    state[m.id] = m.initialState;
  });
  return state;
}

/** Todas as ferramentas de todos os módulos, para mandar à API. */
export function getAllTools() {
  return MODULES.flatMap((m) => m.tools || []);
}

/** Acha quem sabe executar uma tool específica. */
export function getToolHandler(toolName) {
  const owner = MODULES.find((m) => m.tools?.some((t) => t.name === toolName));
  return owner ? owner.handlers[toolName] : null;
}

/** System prompt = base + o que cada módulo tem a dizer sobre sua área. */
export function buildSystemPrompt(state) {
  const now = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const base = `Você é o Balthazar, assistente pessoal do Pedro. Hoje é ${now}, fuso America/Sao_Paulo.

Tom: direto, calmo, sem entusiasmo forçado. Sem emoji. Português do Brasil.
Antes de qualquer ação destrutiva (apagar, remarcar), confirme.`;

  const fragments = MODULES.map((m) => m.systemPromptFragment(state)).join('\n\n');

  return `${base}\n\n${fragments}`;
}
