import React from 'react';
import { money, moneyShort, monthSummary, expensesIn, spentIn, pctOf, todayISO } from '../finance/calc.js';

/* =============================================================
   Início — o dia em cima, a semana embaixo.

   Tudo aqui sai do estado real do app. Onde não existe dado,
   a tela diz que não existe, em vez de inventar número.
   ============================================================= */

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia, Pedro.';
  if (h < 18) return 'Boa tarde, Pedro.';
  return 'Boa noite, Pedro.';
}

/** A frase de abertura: o que aperta hoje, cruzando as áreas. */
function recado(state) {
  const hoje = iso(new Date());
  const eventos = (state.agenda?.events || []).filter((e) => e.date === hoje);
  const cats = state.finance?.categories || [];

  const apertado = cats
    .map((c) => ({ c, pct: pctOf(spentIn(state, c.id), c.limit) }))
    .sort((a, b) => b.pct - a.pct)[0];

  const partes = [];

  if (eventos.length) {
    const proximo = eventos.slice().sort((a, b) => String(a.time).localeCompare(String(b.time)))[0];
    partes.push(
      <React.Fragment key="ag">
        {eventos.length === 1 ? 'Um compromisso hoje: ' : `${eventos.length} compromissos hoje, o primeiro é `}
        <strong>{proximo.title}</strong>
        {proximo.time ? ` às ${proximo.time}` : ''}.
      </React.Fragment>
    );
  } else {
    partes.push(<React.Fragment key="ag">Nada marcado para hoje.</React.Fragment>);
  }

  if (apertado && apertado.pct >= 75) {
    partes.push(
      <React.Fragment key="fin">
        {' '}
        <strong>{apertado.c.name}</strong> já está em {Math.round(apertado.pct)}% do limite do mês — vale segurar.
      </React.Fragment>
    );
  } else if (cats.length) {
    partes.push(<React.Fragment key="fin">{' '}Nas contas, você está no ritmo.</React.Fragment>);
  } else {
    partes.push(
      <React.Fragment key="fin">
        {' '}Ainda não existe limite nenhum criado — me diga quanto quer gastar por mês em alguma coisa e eu começo a acompanhar.
      </React.Fragment>
    );
  }

  return partes;
}

/** Sete dias a partir de domingo desta semana: gasto por dia e compromissos. */
function semana(state) {
  const hoje = new Date();
  const domingo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay());
  const gastos = state.finance?.expenses || [];
  const eventos = state.agenda?.events || [];

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate() + i);
    const chave = iso(d);
    return {
      chave,
      dia: DIAS[i],
      numero: d.getDate(),
      hoje: chave === iso(hoje),
      total: gastos.filter((e) => e.date === chave).reduce((s, e) => s + e.amount, 0),
      eventos: eventos.filter((e) => e.date === chave).length,
    };
  });
}

export default function InicioView({ state }) {
  const s = monthSummary(state);
  const dias = semana(state);
  const maiorDia = Math.max(1, ...dias.map((d) => d.total));
  const eventosHoje = (state.agenda?.events || []).filter((e) => e.date === todayISO()).length;
  const temLimite = (state.finance?.categories || []).length > 0;
  const lancamentos = expensesIn(state).length;

  const proximos = (state.agenda?.events || [])
    .filter((e) => e.date > todayISO())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3);

  return (
    <div className="wrap inicio">
      <h1 className="in-ola">{saudacao()}</h1>
      <p className="in-recado">{recado(state)}</p>

      <div className="in-numeros">
        <div>
          <div className="k">Hoje</div>
          <div className="v">{eventosHoje ? `${eventosHoje} ${eventosHoje === 1 ? 'evento' : 'eventos'}` : 'livre'}</div>
        </div>
        <div>
          <div className="k">Sobra por dia</div>
          <div className="v">{temLimite ? money(s.perDay) : '—'}</div>
        </div>
        <div>
          <div className="k">Este mês</div>
          <div className="v">{temLimite ? moneyShort(s.spent) : `${lancamentos} lanç.`}</div>
        </div>
      </div>

      <p className="lbl">Sua semana</p>
      <div className="in-semana">
        {dias.map((d) => (
          <div key={d.chave} className={'in-dia' + (d.hoje ? ' hoje' : '')}>
            <span className={'pt' + (d.eventos ? '' : ' vazio')} />
            <div className="tra">
              <div className="pre" style={{ height: Math.round((d.total / maiorDia) * 100) + '%' }} />
            </div>
            <span className="d">{d.dia}</span>
          </div>
        ))}
      </div>
      <p className="in-legenda">altura = o que você gastou no dia · ponto = compromisso marcado</p>

      {proximos.length > 0 && (
        <>
          <p className="lbl">O que vem</p>
          <div className="in-curso">
            {proximos.map((e, i) => (
              <div className="in-item" key={i}>
                <div>
                  <div className="t">{e.title}</div>
                  <div className="s">{e.place || 'sem local'}</div>
                </div>
                <span className="q">
                  {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                  {e.time ? ` · ${e.time}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
