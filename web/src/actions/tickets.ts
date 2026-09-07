"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import { notifyRequesterComment } from "@/lib/notify-requester";
import { scheduleTicketAlerts } from "@/lib/sector-notify";
import { fail, ok, type ActionResult } from "@/lib/types";

const createTicketSchema = z.object({
  room_id: z.string().uuid("Selecione a sala"),
  sector_id: z.string().uuid("Selecione o setor"),
  description: z.string().trim().min(3, "Descreva o chamado"),
});

const createPublicTicketSchema = createTicketSchema.extend({
  requester_name: z.string().trim().min(2, "Informe seu nome"),
});

export async function createPublicTicketAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createPublicTicketSchema.safeParse({
    room_id: formData.get("room_id"),
    sector_id: formData.get("sector_id"),
    requester_name: formData.get("requester_name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Dados inválidos",
    );
  }

  try {
    const admin = createAdminClient();

    const [{ data: room }, { data: sector }] = await Promise.all([
      admin
        .from("rooms")
        .select("id, name")
        .eq("id", parsed.data.room_id)
        .eq("is_active", true)
        .maybeSingle(),
      admin
        .from("sectors")
        .select("id, name")
        .eq("id", parsed.data.sector_id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (!room) return fail("ROOM_NOT_FOUND", "Sala inválida ou inativa.");
    if (!sector) return fail("SECTOR_NOT_FOUND", "Setor inválido ou inativo.");

    const { data: ticket, error } = await admin
      .from("tickets")
      .insert({
        room_id: parsed.data.room_id,
        sector_id: parsed.data.sector_id,
        created_by: null,
        requester_name: parsed.data.requester_name,
        description: parsed.data.description,
      })
      .select("id, description, requester_name, created_at")
      .single();

    if (error || !ticket) {
      return fail("INTERNAL_ERROR", "Não foi possível abrir o chamado.");
    }

    scheduleTicketAlerts({
      admin,
      sectorId: parsed.data.sector_id,
      ticket: {
        id: ticket.id,
        description: ticket.description,
        room_name: room.name,
        sector_name: sector.name,
        requester_name: ticket.requester_name,
        created_at: ticket.created_at,
      },
    });

    revalidatePath("/setor");
    return ok({ id: ticket.id });
  } catch (err) {
    console.error("PUBLIC_TICKET_FAILED", err);
    return fail("INTERNAL_ERROR", "Não foi possível abrir o chamado.");
  }
}

export async function createTicketAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session) return fail("UNAUTHORIZED", "Faça login para continuar.");
  if (session.profile.role !== "user") {
    return fail("FORBIDDEN", "Apenas usuários podem abrir chamados.");
  }

  const parsed = createTicketSchema.safeParse({
    room_id: formData.get("room_id"),
    sector_id: formData.get("sector_id"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const requesterName =
    session.profile.full_name?.trim() ||
    session.profile.email.split("@")[0];

  const supabase = await createClient();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      room_id: parsed.data.room_id,
      sector_id: parsed.data.sector_id,
      created_by: session.userId,
      requester_name: requesterName,
      description: parsed.data.description,
    })
    .select("*, rooms(id, name, code), sectors(id, name, slug)")
    .single();

  if (error || !ticket) {
    return fail("INTERNAL_ERROR", "Não foi possível abrir o chamado.");
  }

  // WhatsApp + ntfy: admins do setor + super_admin (cada um só se tiver canal cadastrado)
  scheduleTicketAlerts({
    admin: createAdminClient(),
    sectorId: parsed.data.sector_id,
    ticket: {
      id: ticket.id,
      description: ticket.description,
      room_name: ticket.rooms?.name ?? "Sala",
      sector_name: ticket.sectors?.name ?? "Setor",
      requester_name: ticket.requester_name,
      created_at: ticket.created_at,
    },
  });

  revalidatePath("/meus-chamados");
  revalidatePath("/setor");
  return ok({ id: ticket.id });
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "cancelled"]),
});

export async function updateTicketStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session) return fail("UNAUTHORIZED", "Faça login para continuar.");
  if (session.profile.role === "user") {
    return fail("FORBIDDEN", "Sem permissão para alterar status.");
  }

  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Status inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tickets")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  if (error) {
    return fail("FORBIDDEN", "Não foi possível atualizar o chamado.");
  }

  revalidatePath("/setor");
  return ok();
}

const commentSchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().trim().min(2, "Escreva um comentário"),
});

export async function addTicketCommentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session) return fail("UNAUTHORIZED", "Faça login para continuar.");
  if (session.profile.role === "user") {
    return fail("FORBIDDEN", "Apenas administradores podem comentar.");
  }

  const parsed = commentSchema.safeParse({
    ticket_id: formData.get("ticket_id"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Comentário inválido",
    );
  }

  const supabase = await createClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, created_by, rooms(name)")
    .eq("id", parsed.data.ticket_id)
    .single();

  if (ticketError || !ticket) {
    return fail("TICKET_NOT_FOUND", "Chamado não encontrado.");
  }

  const { data: comment, error } = await supabase
    .from("ticket_comments")
    .insert({
      ticket_id: parsed.data.ticket_id,
      author_id: session.userId,
      body: parsed.data.body,
    })
    .select("id, body")
    .single();

  if (error || !comment) {
    return fail("FORBIDDEN", "Não foi possível salvar o comentário.");
  }

  if (ticket.created_by) {
    const { data: requester } = await createAdminClient()
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", ticket.created_by)
      .single();

    if (requester) {
      const roomRelation = ticket.rooms as
        | { name: string }
        | { name: string }[]
        | null
        | undefined;
      const roomName = Array.isArray(roomRelation)
        ? (roomRelation[0]?.name ?? "Sala")
        : (roomRelation?.name ?? "Sala");

      void notifyRequesterComment({
        requesterId: requester.id,
        requesterEmail: requester.email,
        ticketId: ticket.id,
        commentId: comment.id,
        commentBody: comment.body,
        authorName:
          session.profile.full_name?.trim() ||
          session.profile.email.split("@")[0],
        roomName,
      });
    }
  }

  revalidatePath("/setor");
  revalidatePath("/meus-chamados");
  return ok({ id: comment.id });
}

export async function markNotificationsReadAction(): Promise<void> {
  const session = await getSessionProfile();
  if (!session) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);
}
