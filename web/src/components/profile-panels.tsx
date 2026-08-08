"use client";

import { useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { updateProfileAction } from "@/actions/profile";
import {
  requestPasswordChangeAction,
  confirmPasswordChangeAction,
} from "@/actions/auth";
import type { Profile } from "@/lib/types";

export function ProfilePanels({ profile }: { profile: Profile }) {
  const [mailState, setMailState] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6">
      <div className="panel form-stack">
        <h2 className="m-0 text-lg font-bold text-brand-deep">Dados</h2>
        <ActionForm
          action={updateProfileAction}
          className="form-stack"
          onSuccessMessage="Perfil atualizado."
        >
          <div className="field">
            <label htmlFor="full_name">Nome</label>
            <input
              id="full_name"
              name="full_name"
              className="input"
              defaultValue={profile.full_name ?? ""}
              required={profile.role === "user"}
            />
          </div>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              className="input"
              value={profile.email}
              disabled
              readOnly
            />
          </div>
          {(profile.role === "admin" || profile.role === "super_admin") && (
            <div className="field">
              <label htmlFor="whatsapp">WhatsApp</label>
              <input
                id="whatsapp"
                name="whatsapp"
                className="input"
                placeholder="+5511999999999"
                defaultValue={profile.whatsapp ?? ""}
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary">
            Salvar
          </button>
        </ActionForm>
      </div>

      <div className="panel form-stack">
        <h2 className="m-0 text-lg font-bold text-brand-deep">Trocar senha</h2>
        <p className="m-0 text-sm text-ink-muted">
          Enviaremos um link de validação para {profile.email}. Depois de abrir o
          e-mail, defina a nova senha abaixo.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => {
            setMailState(null);
            startTransition(async () => {
              const result = await requestPasswordChangeAction();
              if (!result.ok) {
                setMailState(result.error.message);
                return;
              }
              setMailState("E-mail enviado. Confira sua caixa de entrada.");
            });
          }}
        >
          Enviar validação por e-mail
        </button>
        {mailState ? (
          <p className={mailState.includes("E-mail enviado") ? "alert-ok" : "alert-error"}>
            {mailState}
          </p>
        ) : null}

        <ActionForm
          action={confirmPasswordChangeAction}
          className="form-stack"
          onSuccessMessage="Senha alterada."
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
              autoComplete="new-password"
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
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Alterar senha
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
