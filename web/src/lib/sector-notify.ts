import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { notifyWhatsApp } from "@/lib/whatsapp";
import { notifyNtfy } from "@/lib/ntfy";

export type SectorNotifyProfile = {
  full_name: string | null;
  whatsapp: string | null;
  ntfy_topic: string | null;
  role: string;
  sector_id: string | null;
};

type TicketNotifyInfo = {
  id: string;
  description: string;
  room_name: string;
  sector_name: string;
  requester_name: string;
  created_at: string;
};

/**
 * Destinatários de alerta de novo chamado:
 * - admins do setor do ticket
 * - todos os super_admins
 */
export async function fetchSectorNotifyProfiles(
  admin: SupabaseClient,
  sectorId: string,
): Promise<SectorNotifyProfile[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("full_name, whatsapp, ntfy_topic, role, sector_id")
    .in("role", ["admin", "super_admin"]);

  if (error) {
    console.error("SECTOR_NOTIFY_LOOKUP_FAILED", error);
    return [];
  }

  return ((data ?? []) as SectorNotifyProfile[]).filter(
    (profile) =>
      profile.role === "super_admin" || profile.sector_id === sectorId,
  );
}

/**
 * Agenda WhatsApp + ntfy após a resposta (after), para a Vercel não
 * matar o fetch fire-and-forget antes de completar.
 */
export function scheduleTicketAlerts(input: {
  admin: SupabaseClient;
  sectorId: string;
  ticket: TicketNotifyInfo;
}): void {
  after(async () => {
    try {
      const recipients = await fetchSectorNotifyProfiles(
        input.admin,
        input.sectorId,
      );

      const whatsappRecipients = recipients
        .filter((r) => r.whatsapp)
        .map((r) => ({
          whatsapp: r.whatsapp as string,
          admin_name: r.full_name,
        }));

      const ntfyRecipients = recipients
        .filter((r) => r.ntfy_topic?.trim())
        .map((r) => ({
          topic: (r.ntfy_topic as string).trim(),
          admin_name: r.full_name,
        }));

      console.info("TICKET_NOTIFY", {
        ticketId: input.ticket.id,
        sectorId: input.sectorId,
        staff: recipients.length,
        whatsapp: whatsappRecipients.length,
        ntfy: ntfyRecipients.length,
        ntfyTopics: ntfyRecipients.map((r) => r.topic),
      });

      await Promise.all([
        notifyWhatsApp({
          ticket: input.ticket,
          recipients: whatsappRecipients,
        }),
        notifyNtfy({
          ticket: input.ticket,
          recipients: ntfyRecipients,
        }),
      ]);
    } catch (err) {
      console.error("TICKET_NOTIFY_FAILED", err);
    }
  });
}
