"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/types";
import { BrandMark } from "@/components/brand-mark";
import { logoutAction } from "@/actions/auth";

const linksByRole: Record<AppRole, { href: string; label: string }[]> = {
  user: [
    { href: "/chamados/novo", label: "Abrir chamado" },
    { href: "/meus-chamados", label: "Meus chamados" },
    { href: "/perfil", label: "Perfil" },
  ],
  admin: [
    { href: "/setor", label: "Chamados" },
    { href: "/perfil", label: "Perfil" },
  ],
  super_admin: [
    { href: "/setor", label: "Chamados" },
    { href: "/salas", label: "Salas" },
    { href: "/setores", label: "Setores" },
    { href: "/admins", label: "Admins" },
    { href: "/perfil", label: "Perfil" },
  ],
};

export function AppShell({
  role,
  email,
  children,
}: {
  role: AppRole;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = linksByRole[role];

  return (
    <div className="shell">
      <header className="shell-header">
        <BrandMark size="sm" href={role === "user" ? "/chamados/novo" : "/setor"} />
        <nav className="shell-nav" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-muted sm:inline">{email}</span>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  );
}
