import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export async function getSessionProfile(): Promise<{
  userId: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  return { userId: user.id, profile: profile as Profile };
}

export async function requireProfile() {
  const session = await getSessionProfile();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function homeForRole(role: Profile["role"]) {
  if (role === "user") return "/chamados/novo";
  return "/setor";
}
