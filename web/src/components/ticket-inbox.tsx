"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Ticket, TicketComment } from "@/lib/types";
import {
  addTicketCommentAction,
  updateTicketStatusAction,
} from "@/actions/tickets";
import { ActionForm } from "@/components/action-form";
import { CommentThread } from "@/components/comment-thread";
import { TicketSections } from "@/components/ticket-sections";
import {
  splitTicketsByStatus,
  ticketBadgeClass,
  ticketStatusLabels,
} from "@/lib/ticket-status";

function AdminTicketRow({
  ticket,
  comments,
}: {
  ticket: Ticket;
  comments: TicketComment[];
}) {
  return (
    <li className="list-row ticket-row">
      <div className="min-w-0 ticket-main">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className={ticketBadgeClass[ticket.status]}>
            {ticketStatusLabels[ticket.status]}
          </span>
          <strong>{ticket.requester_name}</strong>
          <span className="text-ink-muted">·</span>
          <span>{ticket.rooms?.name ?? "Sala"}</span>
          <span className="text-ink-muted">·</span>
          <span>{ticket.sectors?.name ?? "Setor"}</span>
        </div>
        <p className="m-0 text-[0.95rem] text-ink">{ticket.description}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {new Date(ticket.created_at).toLocaleString("pt-BR")}
        </p>

        <div className="ticket-comments">
          <p className="comment-heading">
            Comentários
            {comments.length > 0 ? ` (${comments.length})` : ""}
          </p>
          <CommentThread comments={comments} />
          <ActionForm
            action={addTicketCommentAction}
            className="form-stack comment-form"
            onSuccessMessage="Comentário enviado. O solicitante foi notificado."
          >
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <div className="field">
              <label htmlFor={`comment-${ticket.id}`}>Novo comentário</label>
              <textarea
                id={`comment-${ticket.id}`}
                name="body"
                className="textarea"
                required
                minLength={2}
                placeholder="Atualize o solicitante sobre o andamento…"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Comentar e notificar
            </button>
          </ActionForm>
        </div>
      </div>

      <ActionForm action={updateTicketStatusAction} className="shrink-0 form-stack">
        <input type="hidden" name="id" value={ticket.id} />
        <select
          name="status"
          className="select"
          defaultValue={ticket.status}
          aria-label="Status do chamado"
        >
          {Object.entries(ticketStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">
          Atualizar
        </button>
      </ActionForm>
    </li>
  );
}

export function TicketInbox({
  initial = [],
  initialComments = [],
}: {
  initial?: Ticket[];
  initialComments?: TicketComment[];
}) {
  const [tickets, setTickets] = useState<Ticket[]>(initial ?? []);
  const [comments, setComments] = useState<TicketComment[]>(
    initialComments ?? [],
  );

  useEffect(() => {
    setTickets(initial ?? []);
  }, [initial]);

  useEffect(() => {
    setComments(initialComments ?? []);
  }, [initialComments]);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const [{ data: ticketData }, { data: commentData }] = await Promise.all([
        supabase
          .from("tickets")
          .select("*, rooms(id, name, code), sectors(id, name, slug)")
          .order("created_at", { ascending: false }),
        supabase
          .from("ticket_comments")
          .select("*, profiles(id, full_name, email, role)")
          .order("created_at", { ascending: true }),
      ]);
      if (ticketData) setTickets(ticketData as Ticket[]);
      if (commentData) setComments(commentData as TicketComment[]);
    }

    const channel = supabase
      .channel("tickets-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_comments" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const commentsByTicket = (comments ?? []).reduce<
    Record<string, TicketComment[]>
  >((acc, comment) => {
    (acc[comment.ticket_id] ??= []).push(comment);
    return acc;
  }, {});

  const { open, closed } = splitTicketsByStatus(tickets ?? []);

  if (tickets.length === 0) {
    return <p className="empty">Nenhum chamado na fila.</p>;
  }

  return (
    <TicketSections
      openCount={open.length}
      closedCount={closed.length}
      liveHint={
        <div className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
          <span className="live-dot" aria-hidden />
          Atualizando em tempo real
        </div>
      }
      openEmpty={<p className="empty">Nenhum chamado em aberto.</p>}
      openList={open.map((ticket) => (
        <AdminTicketRow
          key={ticket.id}
          ticket={ticket}
          comments={commentsByTicket[ticket.id] ?? []}
        />
      ))}
      closedList={closed.map((ticket) => (
        <AdminTicketRow
          key={ticket.id}
          ticket={ticket}
          comments={commentsByTicket[ticket.id] ?? []}
        />
      ))}
    />
  );
}
