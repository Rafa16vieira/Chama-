import { redirect } from "next/navigation";
import { getSessionProfile, homeForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandMark } from "@/components/brand-mark";
import { ActionForm } from "@/components/action-form";
import { AuthStage } from "@/components/motion/auth-stage";
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
    <AuthStage layout="public">
      <header className="public-hero motion-hero">
        <BrandMark size="lg" href={null} />
        <p className="motion-lead public-tagline">
          Chamados de salas, no lugar certo.
        </p>
      </header>

      <section className="public-form motion-panel" aria-label="Abrir chamado">
        <p className="page-lead text-center">
          Informe a sala, seu nome e o que precisa de atenção.
        </p>
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
      </section>
    </AuthStage>
  );
}
