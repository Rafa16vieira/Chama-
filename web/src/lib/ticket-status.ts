import type { Ticket, TicketStatus } from "@/lib/types";

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

export const ticketBadgeClass: Record<TicketStatus, string> = {
  open: "badge badge-open",
  in_progress: "badge badge-progress",
  resolved: "badge badge-resolved",
  cancelled: "badge badge-cancelled",
};

export function isClosedTicket(status: TicketStatus) {
  return status === "resolved" || status === "cancelled";
}

export function splitTicketsByStatus<T extends { status: TicketStatus }>(
  tickets: T[],
) {
  const open: T[] = [];
  const closed: T[] = [];

  for (const ticket of tickets) {
    if (isClosedTicket(ticket.status)) closed.push(ticket);
    else open.push(ticket);
  }

  return { open, closed };
}

export type TicketWithRelations = Ticket;
