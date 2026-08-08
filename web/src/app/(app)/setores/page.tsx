import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import {
  createSectorAction,
  updateSectorAction,
  deleteSectorAction,
} from "@/actions/catalog";

export default async function SetoresPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "super_admin") redirect("/setor");

  const supabase = await createClient();
  const { data: sectors } = await supabase
    .from("sectors")
    .select("*")
    .order("name");

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Setores</h1>
        <p className="page-lead">Administração, TI e outros setores de atendimento.</p>
      </header>

      <div className="panel">
        <h2 className="mt-0 text-lg font-bold text-brand-deep">Novo setor</h2>
        <ActionForm
          action={createSectorAction}
          className="form-stack"
          onSuccessMessage="Setor criado."
        >
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              name="slug"
              required
              className="input"
              placeholder="ex.: administracao"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Adicionar setor
          </button>
        </ActionForm>
      </div>

      <div className="panel">
        {!sectors?.length ? (
          <p className="empty">Cadastre o primeiro setor.</p>
        ) : (
          <ul>
            {sectors.map((sector) => (
              <li key={sector.id} className="list-row">
                <ActionForm action={updateSectorAction} className="form-stack w-full">
                  <input type="hidden" name="id" value={sector.id} />
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <input
                      name="name"
                      className="input"
                      defaultValue={sector.name}
                      aria-label="Nome do setor"
                    />
                    <select
                      name="is_active"
                      className="select"
                      defaultValue={sector.is_active ? "true" : "false"}
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                  <p className="m-0 text-xs text-ink-muted">slug: {sector.slug}</p>
                  <button type="submit" className="btn btn-secondary">
                    Salvar
                  </button>
                </ActionForm>
                <form action={deleteSectorAction}>
                  <input type="hidden" name="id" value={sector.id} />
                  <button type="submit" className="btn btn-danger">
                    Desativar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
