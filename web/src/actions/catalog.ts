"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/types";

async function requireSuperAdmin() {
  const session = await getSessionProfile();
  if (!session) return { error: fail("UNAUTHORIZED", "Faça login para continuar.") };
  if (session.profile.role !== "super_admin") {
    return { error: fail("FORBIDDEN", "Apenas o admin principal.") };
  }
  return { session };
}

const roomSchema = z.object({
  name: z.string().trim().min(2, "Nome da sala"),
  code: z.string().trim().optional(),
});

export async function createRoomAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const parsed = roomSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
  });
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").insert({
    name: parsed.data.name,
    code: parsed.data.code || null,
  });

  if (error) return fail("CONFLICT", "Não foi possível criar a sala.");
  revalidatePath("/salas");
  return ok();
}

export async function updateRoomAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const isActive = formData.get("is_active") === "true";

  if (!id || name.length < 2) return fail("VALIDATION_ERROR", "Dados inválidos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ name, code: code || null, is_active: isActive })
    .eq("id", id);

  if (error) return fail("INTERNAL_ERROR", "Não foi possível atualizar a sala.");
  revalidatePath("/salas");
  return ok();
}

export async function deleteRoomAction(formData: FormData): Promise<void> {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return;

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { error } = await supabase
    .from("rooms")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    await supabase.from("rooms").delete().eq("id", id);
  }

  revalidatePath("/salas");
}

const sectorSchema = z.object({
  name: z.string().trim().min(2, "Nome do setor"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "Slug: letras minúsculas, números e _"),
});

export async function createSectorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const parsed = sectorSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sectors").insert(parsed.data);
  if (error) return fail("CONFLICT", "Não foi possível criar o setor.");
  revalidatePath("/setores");
  return ok();
}

export async function updateSectorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("is_active") === "true";

  if (!id || name.length < 2) return fail("VALIDATION_ERROR", "Dados inválidos");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sectors")
    .update({ name, is_active: isActive })
    .eq("id", id);

  if (error) return fail("INTERNAL_ERROR", "Não foi possível atualizar o setor.");
  revalidatePath("/setores");
  return ok();
}

export async function deleteSectorAction(formData: FormData): Promise<void> {
  const gate = await requireSuperAdmin();
  if ("error" in gate && gate.error) return;

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("sectors").update({ is_active: false }).eq("id", id);
  revalidatePath("/setores");
}
