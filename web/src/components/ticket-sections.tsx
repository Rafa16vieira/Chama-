import type { ReactNode } from "react";

export function TicketSections({
  openCount,
  closedCount,
  openEmpty,
  openList,
  closedList,
  liveHint,
}: {
  openCount: number;
  closedCount: number;
  openEmpty: ReactNode;
  openList: ReactNode;
  closedList: ReactNode;
  liveHint?: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <section className="panel" aria-labelledby="tickets-open-title">
        {liveHint}
        <div className="section-head">
          <h2 id="tickets-open-title" className="section-title">
            Em aberto
          </h2>
          <span className="badge">{openCount}</span>
        </div>
        {openCount === 0 ? openEmpty : <ul className="m-0 list-none p-0">{openList}</ul>}
      </section>

      <details className="collapse-panel" aria-labelledby="tickets-closed-title">
        <summary className="collapse-summary">
          <span id="tickets-closed-title" className="section-title">
            Resolvidos
          </span>
          <span className="badge badge-cancelled">{closedCount}</span>
        </summary>
        <div className="collapse-body">
          {closedCount === 0 ? (
            <p className="empty">Nenhum chamado resolvido ainda.</p>
          ) : (
            <ul className="m-0 list-none p-0">{closedList}</ul>
          )}
        </div>
      </details>
    </div>
  );
}
