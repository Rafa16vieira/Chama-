"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import { notifyWhatsApp } from "@/lib/whatsapp";
import { notifyRequesterComment } from "@/lib/notify-requester";
import { fail, ok, type ActionResult } from "@/lib/types";

const createTicketSchema = z.object({
  room_id: z.string().uuid("Selecione a sala"),
  sector_id: z.string().uuid("Selecione o setor"),
  description: z.string().trim().min(3, "Descreva o chamado"),
});

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

  // WhatsApp: admins do setor + super_admin com whatsapp
  try {
    const admin = createAdminClient();
    const { data: recipients } = await admin
      .from("profiles")
      .select("full_name, whatsapp, role, sector_id")
      .not("whatsapp", "is", null)
      .or(
        `and(role.eq.admin,sector_id.eq.${parsed.data.sector_id}),role.eq.super_admin`,
      );

    const list =
      recipients
        ?.filter((r) => r.whatsapp)
        .map((r) => ({
          whatsapp: r.whatsapp as string,
          admin_name: r.full_name,
        })) ?? [];

    void notifyWhatsApp({
      ticket: {
        id: ticket.id,
        description: ticket.description,
        room_name: ticket.rooms?.name ?? "Sala",
        sector_name: ticket.sectors?.name ?? "Setor",
        requester_name: ticket.requester_name,
        created_at: ticket.created_at,
      },
      recipients: list,
    });
  } catch (err) {
    console.error("WHATSAPP_NOTIFY_FAILED", err);
  }

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
