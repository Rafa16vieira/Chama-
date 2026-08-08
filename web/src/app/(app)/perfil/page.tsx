import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ProfilePanels } from "@/components/profile-panels";

export default async function PerfilPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Perfil</h1>
        <p className="page-lead">
          Atualize seus dados e altere a senha com validação por e-mail.
        </p>
      </header>
      <ProfilePanels profile={session.profile} />
    </div>
  );
}
