"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/types";
import { homeForRole, getSessionProfile } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return fail("INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
  }

  const session = await getSessionProfile();
  redirect(session ? homeForRole(session.profile.role) : "/");
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha com pelo menos 6 caracteres"),
});

export async function signupAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return fail("CONFLICT", error.message);
  }

  redirect("/chamados/novo");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordChangeAction(): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session) return fail("UNAUTHORIZED", "Faça login para continuar.");

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(session.profile.email, {
    redirectTo: `${origin}/auth/callback?next=/atualizar-senha`,
  });

  if (error) {
    return fail("INTERNAL_ERROR", "Não foi possível enviar o e-mail. Tente de novo.");
  }

  return ok({ sent: true });
}

const passwordSchema = z
  .object({
    password: z.string().min(6, "Nova senha com pelo menos 6 caracteres"),
    confirm: z.string().min(6, "Confirme a senha"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

export async function confirmPasswordChangeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return fail("RECOVERY_REQUIRED", "Sessão de recuperação inválida. Solicite um novo e-mail.");
  }

  return ok();
}
