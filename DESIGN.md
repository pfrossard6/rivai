# Riv.AI — Padrão visual

Consolidado a partir do mockup de onboarding aprovado (v3, "o rio"). Isso é a referência única daqui pra frente — qualquer tela nova parte destes tokens, não de escolha nova a cada vez.

## Princípio

Riv.AI é fluxo, não prateleira nem dashboard. Um único destaque de cor (a água), reservado pra progresso e estado preenchido — nunca decoração. Tudo o resto é tinta e papel.

## Cor — "Nascente"

Rio de cabeceira: água fria de montanha sobre pedra. A direção mais austera entre as quatro exploradas — deliberadamente perto do registro sóbrio do Claude, que é o benchmark de tom que você definiu pro produto.

| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#F4F5F4` | fundo principal |
| `--paper-dim` | `#EAEBEA` | fundo de área secundária (coluna do rio, fundo da página) |
| `--ink` | `#16191C` | texto principal, botão primário |
| `--ink-soft` | `#565C55` | texto secundário |
| `--ink-faint` | `#9BA1A3` | texto terciário, placeholder, estado "a responder" |
| `--line` | `#D8DBDA` | bordas, divisores |
| `--current` | `#3B5B6B` | **único destaque** — água do rio, estado preenchido, foco, botão selecionado |
| `--current-soft` | `#DCE4E7` | fundo de card/estado usando o destaque, sem competir com o texto |
| `--dry` | `#C7CCC9` | trecho do rio ainda não percorrido |

Regra: `--current` nunca é cor de fundo de página nem de bloco grande. Ele marca *o que já foi respondido* ou *ação disponível* — se aparecer em algo estático, está sendo mal usado.

Nada de creme+terracota (clichê de design gerado por IA), nada de oliva+bege (paleta do Bench), nada de azul-céu genérico ("água = azul" óbvio). Este é um azul-ardósia frio, quase cinza — deliberadamente contido.

## Tipografia

- **Source Serif 4** — títulos de pergunta, labels do rio (itálico), nome de trilha. Carrega a personalidade da marca.
- **Inter** — tudo o resto: botões, corpo de texto, microcopy, campos.

Nunca usar Source Serif 4 pra texto de UI funcional (botão, label de campo) — é reservada pra momento de leitura, não pra interface.

## Componentes

**Botão de opção (pill)**
- Não selecionado: borda 1.5px `--line`, fundo branco, texto `--ink`, `border-radius: 24px`
- Selecionado: fundo `--current`, texto branco, mesma borda
- Uso: quando as opções cabem numa linha (poucas palavras, tipo Setor)

**Botão de opção (lista)**
- Mesma lógica de cor, mas `border-radius: 8px` e empilhado verticalmente
- Uso: quando o texto da opção é mais longo (tipo Porte, Gargalo)

**Botão primário (avançar)**
- Fundo `--ink`, texto branco, `border-radius: 24px`
- Desabilitado: opacidade 35%

**Card de resultado/rota**
- Borda 1.5px `--current`, fundo `--current-soft`, `border-radius: 10px`
- Label em maiúscula pequena na cor `--current`, título em serif

**O rio (indicador de progresso + resumo)**
- SVG com curva suave conectando um nó por pergunta
- Trecho respondido: `--current`, 3px, preenchido via `stroke-dashoffset` animado (0.6s ease)
- Trecho futuro: `--dry`, 2.5px, estático
- Nó ativo: anel pulsante (`ping`) em `--current`, looping suave, opacidade decrescente
- Legenda da resposta: Source Serif 4 itálico, 12px, aparece abaixo/ao lado do nó assim que respondido

## Movimento

- Preenchimento do rio: única transição "grande" da tela, 0.6s ease
- Ping no nó ativo: looping contínuo, mas discreto (opacidade máxima 55%)
- Nada mais anima. Sem hover exagerado, sem entrada de elemento com bounce, sem confete em lugar nenhum

## O que isso NÃO é

- Não é painel lateral com lista de campos
- Não é dashboard com cards retangulares de dado
- Não tem emoji, não tem gamificação, não tem linguagem de encorajamento — regra que já valia pro produto inteiro, continua valendo aqui
