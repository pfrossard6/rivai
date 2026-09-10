# Balthazar — arquitetura de módulos

## Estrutura

```
src/
  BalthazarApp.jsx      shell (não conhece nenhum módulo)
  BalthazarBar.jsx      chat fixo (não conhece nenhum módulo)
  balthazar.css
  modules/
    registry.js         ÚNICO arquivo que lista os módulos
    finance/
      index.js          definição do módulo
      FinanceView.jsx   a aba
    agenda/
    investments/
```

## O contrato de um módulo

Todo módulo exporta um objeto com estes campos:

| campo | o que é |
|---|---|
| `id` | identificador único, minúsculo |
| `label` | nome que aparece na sidebar |
| `enabled` | `false` esconde sem apagar código |
| `view` | componente React da aba, recebe `{ state, setState }` |
| `subViews` | alternativa a `view`: lista `{ id, label, view }` quando a área tem mais de um espaço. Vira uma fileira de abas dentro do módulo, e a sidebar continua com um item só. A primeira abre por padrão. |
| `initialState` | forma inicial dos dados desse módulo |
| `tools` | ferramentas que o Balthazar pode chamar |
| `handlers` | função que roda para cada tool, recebe `(input, state, setState)` |
| `systemPromptFragment` | função `(state) => string` com o que o Balthazar sabe da área |

## Adicionar E-mail (exemplo do próximo passo)

1. Criar `src/modules/email/index.js` seguindo o contrato acima
2. Em `registry.js`: `import email from './email/index.js'`
3. Adicionar `email` na lista `ALL_MODULES`

Pronto. Nenhum arquivo existente muda.

## Como a sidebar fica com o roadmap inteiro

```
Finanças
  ├─ Gastos          limites e categorias
  ├─ Assinaturas     fase 4
  └─ Investimentos   cotações e notícias
Agenda
E-mail
Vida Pessoal
Viagem
```

Cinco itens na sidebar em vez de nove. Sub-abas são só navegação:
o `systemPromptFragment` continua sendo um por módulo, e o Balthazar
não sabe que essa divisão existe.

## Ordem planejada

1. Finanças + Agenda ← estamos aqui
2. E-mail
3. Vida Pessoal (aniversários, "responder fulano", prazos da faculdade)
4. Assinaturas/recorrências + lista de compras (dentro de Finanças)
5. Eventos com outras pessoas (dentro de Agenda)
6. Viagem
7. Documentos → vira lembrete simples na Agenda, não módulo
8. Briefing matinal (só depois que 2–3 módulos tiverem dado real)

## Pontos em aberto (decidir antes das fases 4–5)

- **Custo de API**: cada módulo soma tools no payload. Com 6 módulos, toda
  mensagem carrega todas as ferramentas. Avaliar mandar só as do módulo ativo
  + as mais usadas, ou cachear o system prompt.
- **`user_id` nas tabelas do Supabase desde já**, mesmo com um usuário só —
  migrar single-user para multi-user depois é caro.
- **Confirmação antes de ação destrutiva**: já está no system prompt base,
  mas vale reforçar no código quando a agenda for real.
