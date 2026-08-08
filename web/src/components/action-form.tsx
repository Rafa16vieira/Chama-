"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/types";

type Props = {
  action: (
    prev: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  onSuccessMessage?: string;
};

export function ActionForm({
  action,
  children,
  className,
  onSuccessMessage,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      {pending ? (
        <p className="text-sm text-ink-muted" aria-live="polite">
          Salvando…
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="alert-error" role="alert">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok && onSuccessMessage ? (
        <p className="alert-ok" role="status">
          {onSuccessMessage}
        </p>
      ) : null}
    </form>
  );
}
