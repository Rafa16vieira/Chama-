import type { SupabaseClient } from "@supabase/supabase-js";

export type SectorNotifyProfile = {
  full_name: string | null;
  whatsapp: string | null;
  ntfy_topic: string | null;
  role: string;
  sector_id: string | null;
};

/**
 * Destinatários de alerta de novo chamado:
 * - admins do setor do ticket
 * - todos os super_admins
 * (mesmo escopo da fila / WhatsApp)
 */
export async function fetchSectorNotifyProfiles(
  admin: SupabaseClient,
  sectorId: string,
): Promise<SectorNotifyProfile[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("full_name, whatsapp, ntfy_topic, role, sector_id")
    .or(`and(role.eq.admin,sector_id.eq.${sectorId}),role.eq.super_admin`);

  if (error) {
    console.error("SECTOR_NOTIFY_LOOKUP_FAILED", error);
    return [];
  }

  return (data ?? []) as SectorNotifyProfile[];
}
