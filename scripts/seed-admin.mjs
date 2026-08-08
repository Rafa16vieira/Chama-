/**
 * Seed do admin principal (dev).
 * Uso:
 *   ALLOW_DEV_SEED=1 node scripts/seed-admin.mjs
 *
 * Requer NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no ambiente
 * (ou em web/.env.local).
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const require = createRequire(resolve(root, "web/package.json"));
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const candidates = [
    resolve(root, "web/.env.local"),
    resolve(root, ".env.local"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i < 0) continue;
      const key = trimmed.slice(0, i);
      const value = trimmed.slice(i + 1).replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnvLocal();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED !== "1") {
  console.error("Seed bloqueado em produção sem ALLOW_DEV_SEED=1");
  process.exit(1);
}

if (process.env.ALLOW_DEV_SEED !== "1") {
  console.error("Defina ALLOW_DEV_SEED=1 para rodar o seed.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const email = "rafaelvieiraalbu@gmail.com";
const password = "123456";

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);

let userId = existing?.id;

if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Rafael Vieira" },
  });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  userId = data.user.id;
  console.log("Usuário Auth criado:", userId);
} else {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("Usuário Auth já existia; senha atualizada:", userId);
}

const { error: profileError } = await admin
  .from("profiles")
  .upsert({
    id: userId,
    email,
    full_name: "Rafael Vieira",
    role: "super_admin",
    sector_id: null,
  });

if (profileError) {
  console.error(profileError);
  process.exit(1);
}

console.log("Profile super_admin pronto para", email);
