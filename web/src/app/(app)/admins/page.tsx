import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import { createAdminAction } from "@/actions/profile";

export default async function AdminsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "super_admin") redirect("/setor");

  const supabase = await createClient();
  const [{ data: sectors }, { data: admins }] = await Promise.all([
    supabase.from("sectors").select("*").eq("is_active", true).order("name"),
    supabase
      .from("profiles")
      .select("*, sectors(name)")
      .eq("role", "admin")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Admins</h1>
        <p className="page-lead">
          Crie admins de Administração ou TI. Eles recebem chamados do setor e
          podem cadastrar WhatsApp para alertas.
        </p>
      </header>

      <div className="panel">
        <h2 className="mt-0 text-lg font-bold text-brand-deep">Novo admin</h2>
        <ActionForm
          action={createAdminAction}
          className="form-stack"
          onSuccessMessage="Admin criado."
        >
          <div className="field">
            <label htmlFor="full_name">Nome</label>
            <input id="full_name" name="full_name" required className="input" />
          </div>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div className="field">
            <label htmlFor="password">Senha inicial</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input"
            />
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
            <label htmlFor="whatsapp">WhatsApp (opcional)</label>
            <input
              id="whatsapp"
              name="whatsapp"
              className="input"
              placeholder="+5511999999999"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Criar admin
          </button>
        </ActionForm>
      </div>

      <div className="panel">
        {!admins?.length ? (
          <p className="empty">Crie o primeiro admin de setor.</p>
        ) : (
          <ul>
            {admins.map((admin) => (
              <li key={admin.id} className="list-row">
                <div>
                  <strong>{admin.full_name}</strong>
                  <p className="m-0 text-sm text-ink-muted">{admin.email}</p>
                  <p className="m-0 text-sm">
                    Setor: {(admin as { sectors?: { name: string } | null }).sectors?.name ?? "—"}
                    {admin.whatsapp ? ` · WhatsApp: ${admin.whatsapp}` : ""}
                  </p>
                </div>
                <span className="badge">admin</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
