import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TicketInbox } from "@/components/ticket-inbox";
import type { Ticket, TicketComment } from "@/lib/types";

export default async function SetorPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role === "user") redirect("/chamados/novo");

  const supabase = await createClient();
  let query = supabase
    .from("tickets")
    .select("*, rooms(id, name, code), sectors(id, name, slug)")
    .order("created_at", { ascending: false });

  if (session.profile.role === "admin" && session.profile.sector_id) {
    query = query.eq("sector_id", session.profile.sector_id);
  }

  const [{ data: tickets }, { data: comments }] = await Promise.all([
    query,
    supabase
      .from("ticket_comments")
      .select("*, profiles(id, full_name, email, role)")
      .order("created_at", { ascending: true }),
  ]);

  let sectorName = "Todos os setores";
  if (session.profile.role === "admin" && session.profile.sector_id) {
    const { data: sector } = await supabase
      .from("sectors")
      .select("name")
      .eq("id", session.profile.sector_id)
      .single();
    sectorName = sector?.name ?? "Seu setor";
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Chamados do setor</h1>
        <p className="page-lead">{sectorName}</p>
      </header>
      <TicketInbox
        initial={(tickets ?? []) as Ticket[]}
        initialComments={(comments ?? []) as TicketComment[]}
      />
    </div>
  );
}
