import React from 'react';

export default function AgendaView({ state }) {
  const events = state.agenda.events;

  if (!events.length) {
    return (
      <p className="empty">
        Sem eventos carregados. A conexão real com o Google Agenda entra na Fase 4.
      </p>
    );
  }

  return (
    <div>
      {events.map((e) => (
        <div className="event-row" key={e.id}>
          <div className="event-time">{e.time}</div>
          <div>
            <div className="event-title">{e.title}</div>
            {e.location && <div className="event-loc">{e.location}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
