import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification, Ticket, TicketComment } from "@/lib/types";
import { MyTicketsList } from "@/components/my-tickets-list";

export default async function MeusChamadosPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "user") redirect("/setor");

  const supabase = await createClient();
  const [{ data: tickets }, { data: comments }, { data: notifications }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("*, rooms(id, name), sectors(id, name)")
        .eq("created_by", session.userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("ticket_comments")
        .select("*, profiles(id, full_name, email, role)")
        .order("created_at", { ascending: true }),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Meus chamados</h1>
          <p className="page-lead">
            Acompanhe o status e os comentários do setor.
          </p>
        </div>
        <Link href="/chamados/novo" className="btn btn-primary">
          Abrir chamado
        </Link>
      </header>

      <MyTicketsList
        initialTickets={(tickets ?? []) as Ticket[]}
        initialComments={(comments ?? []) as TicketComment[]}
        initialNotifications={(notifications ?? []) as AppNotification[]}
      />
    </div>
  );
}
