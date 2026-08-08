import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/action-form";
import {
  createRoomAction,
  updateRoomAction,
  deleteRoomAction,
} from "@/actions/catalog";

export default async function SalasPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "super_admin") redirect("/setor");

  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .order("name");

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Salas</h1>
        <p className="page-lead">Cadastre, edite ou desative salas.</p>
      </header>

      <div className="panel">
        <h2 className="mt-0 text-lg font-bold text-brand-deep">Nova sala</h2>
        <ActionForm
          action={createRoomAction}
          className="form-stack"
          onSuccessMessage="Sala criada."
        >
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div className="field">
            <label htmlFor="code">Código (opcional)</label>
            <input id="code" name="code" className="input" />
          </div>
          <button type="submit" className="btn btn-primary">
            Adicionar sala
          </button>
        </ActionForm>
      </div>

      <div className="panel">
        {!rooms?.length ? (
          <p className="empty">Cadastre a primeira sala.</p>
        ) : (
          <ul>
            {rooms.map((room) => (
              <li key={room.id} className="list-row">
                <ActionForm action={updateRoomAction} className="form-stack w-full">
                  <input type="hidden" name="id" value={room.id} />
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
                    <input
                      name="name"
                      className="input"
                      defaultValue={room.name}
                      aria-label="Nome da sala"
                    />
                    <input
                      name="code"
                      className="input"
                      defaultValue={room.code ?? ""}
                      aria-label="Código"
                    />
                    <select
                      name="is_active"
                      className="select"
                      defaultValue={room.is_active ? "true" : "false"}
                      aria-label="Status"
                    >
                      <option value="true">Ativa</option>
                      <option value="false">Inativa</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-secondary">
                      Salvar
                    </button>
                  </div>
                </ActionForm>
                <form action={deleteRoomAction}>
                  <input type="hidden" name="id" value={room.id} />
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
