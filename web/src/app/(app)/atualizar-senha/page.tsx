import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { confirmPasswordChangeAction } from "@/actions/auth";

export default async function AtualizarSenhaPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Definir nova senha</h1>
        <p className="page-lead">
          Você chegou pelo link do e-mail. Escolha uma nova senha para continuar.
        </p>
      </header>
      <div className="panel">
        <ActionForm
          action={confirmPasswordChangeAction}
          className="form-stack"
          onSuccessMessage="Senha alterada. Você já pode usar a nova senha."
        >
          <div className="field">
            <label htmlFor="password">Nova senha</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={6}
              required
              className="input"
            />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirmar nova senha</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              minLength={6}
              required
              className="input"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Salvar senha
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
