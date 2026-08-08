import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import { createTicketAction } from "@/actions/tickets";

export default async function NovoChamadoPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "user") redirect("/setor");

  const supabase = await createClient();
  const [{ data: rooms }, { data: sectors }] = await Promise.all([
    supabase.from("rooms").select("*").eq("is_active", true).order("name"),
    supabase.from("sectors").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Abrir chamado</h1>
        <p className="page-lead">
          Descreva o problema da sala. O setor certo recebe na hora.
        </p>
      </header>

      <div className="panel">
        <ActionForm
          action={createTicketAction}
          className="form-stack"
          onSuccessMessage="Chamado enviado."
        >
          <div className="field">
            <label htmlFor="room_id">Sala</label>
            <select id="room_id" name="room_id" required className="select">
              <option value="">Selecione</option>
              {(rooms ?? []).map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sector_id">Setor</label>
            <select id="sector_id" name="sector_id" required className="select">
              <option value="">Selecione</option>
              {(sectors ?? []).map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="description">Descrição</label>
            <textarea
              id="description"
              name="description"
              required
              className="textarea"
              placeholder="O que precisa ser resolvido?"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Enviar chamado
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
