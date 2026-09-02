import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ActionForm } from "@/components/action-form";
import { AuthStage } from "@/components/motion/auth-stage";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  return (
    <AuthStage>
      <div className="motion-hero grid gap-3 text-center">
        <div className="flex justify-center">
          <BrandMark size="lg" href="/login" />
        </div>
        <p className="motion-lead page-lead mx-auto text-center">
          Chamados de salas, no lugar certo.
        </p>
      </div>

      <div className="motion-panel panel">
        <ActionForm action={loginAction} className="form-stack">
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Entrar
          </button>
        </ActionForm>
      </div>

      <p className="motion-footer text-center text-sm text-ink-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="link-brand">
          Cadastre-se
        </Link>
      </p>
    </AuthStage>
  );
}
