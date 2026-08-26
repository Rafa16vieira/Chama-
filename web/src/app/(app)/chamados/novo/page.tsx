import { redirect } from "next/navigation";

/** Chamados públicos ficam na home (`/`). */
export default function NovoChamadoPage() {
  redirect("/");
}
