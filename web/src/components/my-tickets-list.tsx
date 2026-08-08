"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification, Ticket, TicketComment } from "@/lib/types";
import { markNotificationsReadAction } from "@/actions/tickets";
import { CommentThread } from "@/components/comment-thread";
import { TicketSections } from "@/components/ticket-sections";
import {
  splitTicketsByStatus,
  ticketBadgeClass,
  ticketStatusLabels,
} from "@/lib/ticket-status";

function UserTicketRow({
  ticket,
  comments,
  hasUnread,
}: {
  ticket: Ticket;
  comments: TicketComment[];
  hasUnread: boolean;
}) {
  return (
    <li className="list-row ticket-row">
      <div className="min-w-0 w-full">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className={ticketBadgeClass[ticket.status]}>
            {ticketStatusLabels[ticket.status]}
          </span>
          {hasUnread ? <span className="badge badge-open">Novo comentário</span> : null}
          <strong>{ticket.rooms?.name}</strong>
          <span className="text-ink-muted">→</span>
          <span>{ticket.sectors?.name}</span>
        </div>
        <p className="m-0">{ticket.description}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {new Date(ticket.created_at).toLocaleString("pt-BR")}
        </p>

        <div className="ticket-comments">
          <p className="comment-heading">
            Atualizações do setor
            {comments.length > 0 ? ` (${comments.length})` : ""}
          </p>
          <CommentThread
            comments={comments}
            emptyLabel="Ainda sem comentários do setor."
          />
        </div>
      </div>
    </li>
  );
}

export function MyTicketsList({
  initialTickets,
  initialComments,
  initialNotifications,
}: {
  initialTickets: Ticket[];
  initialComments: TicketComment[];
  initialNotifications: AppNotification[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [comments, setComments] = useState(initialComments);
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    setTickets(initialTickets);
    setComments(initialComments);
    setNotifications(initialNotifications);
  }, [initialTickets, initialComments, initialNotifications]);

  useEffect(() => {
    void markNotificationsReadAction();
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: ticketData }, { data: commentData }, { data: notifData }] =
        await Promise.all([
          supabase
            .from("tickets")
            .select("*, rooms(id, name), sectors(id, name)")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("ticket_comments")
            .select("*, profiles(id, full_name, email, role)")
            .order("created_at", { ascending: true }),
          supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

      if (ticketData) setTickets(ticketData as Ticket[]);
      if (commentData) setComments(commentData as TicketComment[]);
      if (notifData) setNotifications(notifData as AppNotification[]);
    }

    const channel = supabase
      .channel("my-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_comments" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
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

  const unreadTicketIds = new Set(
    (notifications ?? [])
      .filter((n) => !n.read_at && n.ticket_id)
      .map((n) => n.ticket_id as string),
  );

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;
  const { open, closed } = splitTicketsByStatus(tickets ?? []);

  if (tickets.length === 0) {
    return (
      <div className="panel">
        <p className="empty">
          Nenhum chamado ainda.{" "}
          <Link href="/chamados/novo" className="font-semibold text-brand">
            Abrir chamado
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {unreadCount > 0 ? (
        <p className="alert-ok" role="status">
          Você tem {unreadCount}{" "}
          {unreadCount === 1 ? "nova notificação" : "novas notificações"} de
          comentário.
        </p>
      ) : null}

      <TicketSections
        openCount={open.length}
        closedCount={closed.length}
        openEmpty={<p className="empty">Nenhum chamado em aberto.</p>}
        openList={open.map((ticket) => (
          <UserTicketRow
            key={ticket.id}
            ticket={ticket}
            comments={commentsByTicket[ticket.id] ?? []}
            hasUnread={unreadTicketIds.has(ticket.id)}
          />
        ))}
        closedList={closed.map((ticket) => (
          <UserTicketRow
            key={ticket.id}
            ticket={ticket}
            comments={commentsByTicket[ticket.id] ?? []}
            hasUnread={unreadTicketIds.has(ticket.id)}
          />
        ))}
      />
    </div>
  );
}
