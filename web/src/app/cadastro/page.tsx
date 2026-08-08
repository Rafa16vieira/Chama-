import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ActionForm } from "@/components/action-form";
import { signupAction } from "@/actions/auth";

export default function SignupPage() {
  return (
    <div className="auth-stage">
      <div className="auth-compose">
        <div className="grid gap-3 text-center">
          <div className="flex justify-center">
            <BrandMark size="lg" href="/login" />
          </div>
          <p className="page-lead mx-auto text-center">
            Informe seu nome para abrir chamados.
          </p>
        </div>

        <div className="panel">
          <ActionForm action={signupAction} className="form-stack">
            <div className="field">
              <label htmlFor="full_name">Nome</label>
              <input
                id="full_name"
                name="full_name"
                required
                className="input"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="input"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Criar conta
            </button>
          </ActionForm>
        </div>

        <p className="text-center text-sm text-ink-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
