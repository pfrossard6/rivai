import React from 'react';

const pad = (n) => String(n).padStart(2, '0');
function isoLocal(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function titulo(iso) {
  if (iso === isoLocal(0)) return 'Hoje';
  if (iso === isoLocal(1)) return 'Amanhã';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AgendaView({ state }) {
  const hoje = isoLocal(0);
  const futuros = state.agenda.events
    .filter((e) => e.date >= hoje)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  if (!futuros.length) {
    return (
      <div className="wrap">
        <p className="empty">
          Nenhum compromisso pela frente. Fala com o Balthazar: "consulta amanhã às 9h no centro". A conexão com o Google Agenda entra na Fase 4.
        </p>
      </div>
    );
  }

  const dias = [];
  futuros.forEach((e) => {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.date === e.date) ultimo.items.push(e);
    else dias.push({ date: e.date, items: [e] });
  });

  return (
    <div className="wrap">
      {dias.map((d) => (
        <div key={d.date}>
          <p className="lbl">{titulo(d.date)}</p>
          {d.items.map((e) => (
            <div className="event-row" key={e.id}>
              <div className="event-time">{e.time}</div>
              <div>
                <div className="event-title">{e.title}</div>
                {e.location && <div className="event-loc">{e.location}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
