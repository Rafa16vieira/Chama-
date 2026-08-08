import { z } from "zod";

export const appRoleSchema = z.enum(["super_admin", "admin", "user"]);
export type AppRole = z.infer<typeof appRoleSchema>;

export const ticketStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "cancelled",
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  sector_id: string | null;
  whatsapp: string | null;
  created_at: string;
  updated_at: string;
};

export type Sector = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Ticket = {
  id: string;
  room_id: string;
  sector_id: string;
  created_by: string;
  requester_name: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  rooms?: Pick<Room, "id" | "name" | "code"> | null;
  sectors?: Pick<Sector, "id" | "name" | "slug"> | null;
  ticket_comments?: TicketComment[];
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: Pick<Profile, "id" | "full_name" | "email" | "role"> | null;
};

export type AppNotification = {
  id: string;
  user_id: string;
  ticket_id: string | null;
  comment_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: { code: string; message: string } };

export function fail(
  code: string,
  message: string,
): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code, message } };
}

export function ok<T>(data?: T): { ok: true; data?: T } {
  return data === undefined ? { ok: true } : { ok: true, data };
}
