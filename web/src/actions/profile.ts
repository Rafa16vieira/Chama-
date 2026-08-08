"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/types";

const whatsappSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Use formato internacional, ex.: +5511999999999")
  .or(z.literal(""))
  .optional();

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session) return fail("UNAUTHORIZED", "Faça login para continuar.");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const whatsappRaw = String(formData.get("whatsapp") ?? "").trim();

  const wa = whatsappSchema.safeParse(whatsappRaw);
  if (!wa.success) {
    return fail("VALIDATION_ERROR", wa.error.issues[0]?.message ?? "WhatsApp inválido");
  }

  if (session.profile.role === "user" && fullName.length < 2) {
    return fail("VALIDATION_ERROR", "Nome é obrigatório.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || session.profile.full_name,
      whatsapp: wa.data || null,
    })
    .eq("id", session.userId);

  if (error) return fail("INTERNAL_ERROR", "Não foi possível salvar o perfil.");
  revalidatePath("/perfil");
  return ok();
}

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(2),
  sector_id: z.string().uuid(),
  whatsapp: z.string().trim().optional(),
});

export async function createAdminAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session) return fail("UNAUTHORIZED", "Faça login para continuar.");
  if (session.profile.role !== "super_admin") {
    return fail("FORBIDDEN", "Apenas o admin principal pode criar admins.");
  }

  const parsed = createAdminSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    sector_id: formData.get("sector_id"),
    whatsapp: formData.get("whatsapp") || "",
  });

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const whatsapp = parsed.data.whatsapp?.trim() || "";
  if (whatsapp && !/^\+?[1-9]\d{7,14}$/.test(whatsapp)) {
    return fail("VALIDATION_ERROR", "WhatsApp inválido. Use +5511999999999");
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (createError || !created.user) {
    return fail("CONFLICT", createError?.message ?? "Não foi possível criar o admin.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role: "admin",
      sector_id: parsed.data.sector_id,
      full_name: parsed.data.full_name,
      whatsapp: whatsapp || null,
    })
    .eq("id", created.user.id);

  if (profileError) {
    return fail("INTERNAL_ERROR", "Usuário criado, mas o perfil admin falhou. Ajuste manualmente.");
  }

  revalidatePath("/admins");
  return ok({ id: created.user.id });
}
