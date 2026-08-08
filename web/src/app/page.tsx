import { redirect } from "next/navigation";
import { getSessionProfile, homeForRole } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  redirect(homeForRole(session.profile.role));
}
