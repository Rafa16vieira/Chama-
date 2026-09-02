"use client";

import { useActionState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { ActionResult } from "@/lib/types";
import { motionDuration, motionEase } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

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
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduceMotion || pending || !state) return;

          const errorEl = feedbackRef.current?.querySelector(".alert-error");
          const okEl = feedbackRef.current?.querySelector(".alert-ok");

          if (errorEl) {
            gsap.fromTo(
              errorEl,
              { autoAlpha: 0, y: 8 },
              {
                autoAlpha: 1,
                y: 0,
                duration: motionDuration.standard,
                ease: motionEase.out,
              },
            );
            gsap.fromTo(
              errorEl,
              { x: 0 },
              {
                keyframes: { x: [-5, 5, -3, 3, 0] },
                duration: 0.38,
                ease: motionEase.inOut,
              },
            );
          }

          if (okEl) {
            gsap.fromTo(
              okEl,
              { autoAlpha: 0, scale: 0.96 },
              {
                autoAlpha: 1,
                scale: 1,
                duration: motionDuration.standard,
                ease: motionEase.out,
              },
            );
          }
        },
        formRef,
      );

      return () => mm.revert();
    },
    { scope: formRef, dependencies: [state, pending], revertOnUpdate: true },
  );

  return (
    <form action={formAction} className={className} ref={formRef}>
      {children}
      <div ref={feedbackRef} className="form-feedback">
        {pending ? (
          <p className="form-pending" aria-live="polite">
            <span className="pending-dot" aria-hidden />
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
      </div>
    </form>
  );
}
