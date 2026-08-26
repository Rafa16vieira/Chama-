import { redirect } from "next/navigation";
import { getSessionProfile, homeForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandMark } from "@/components/brand-mark";
import { ActionForm } from "@/components/action-form";
import { createPublicTicketAction } from "@/actions/tickets";

export default async function HomePage() {
  const session = await getSessionProfile();
  if (session) redirect(homeForRole(session.profile.role));

  const admin = createAdminClient();
  const [{ data: rooms }, { data: sectors }] = await Promise.all([
    admin.from("rooms").select("id, name").eq("is_active", true).order("name"),
    admin.from("sectors").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="auth-stage">
      <div className="auth-compose" style={{ width: "min(480px, 100%)" }}>
        <div className="grid gap-3 text-center">
          <div className="flex justify-center">
            <BrandMark size="lg" href={null} />
          </div>
          <p className="page-lead mx-auto text-center">
            Informe a sala, seu nome e o que precisa de atenção.
          </p>
        </div>

        <div className="panel">
          <ActionForm
            action={createPublicTicketAction}
            className="form-stack"
            onSuccessMessage="Chamado enviado. A equipe já foi notificada."
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
              <label htmlFor="requester_name">Seu nome</label>
              <input
                id="requester_name"
                name="requester_name"
                required
                minLength={2}
                className="input"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label htmlFor="description">Descrição</label>
              <textarea
                id="description"
                name="description"
                required
                minLength={3}
                className="textarea"
                placeholder="Descreva o assunto do chamado"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Enviar chamado
            </button>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
