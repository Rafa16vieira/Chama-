"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motionDuration, motionEase, motionOffset } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type AuthStageProps = {
  children: React.ReactNode;
  /** Formulário público na home — hero full-bleed acima do painel */
  layout?: "default" | "public";
  wide?: boolean;
};

export function AuthStage({
  children,
  layout = "default",
  wide = false,
}: AuthStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduceMotion) return;

          const tl = gsap.timeline({
            defaults: { ease: motionEase.out },
          });

          tl.from(".motion-hero", {
            autoAlpha: 0,
            y: motionOffset.y,
            duration: motionDuration.slow,
          })
            .from(
              ".motion-lead",
              {
                autoAlpha: 0,
                y: motionOffset.ySmall,
                duration: motionDuration.standard,
              },
              "-=0.22",
            )
            .from(
              ".motion-panel",
              {
                autoAlpha: 0,
                y: motionOffset.ySmall,
                scale: 0.98,
                duration: motionDuration.standard,
              },
              "-=0.12",
            )
            .from(
              ".motion-footer",
              {
                autoAlpha: 0,
                duration: motionDuration.quick,
              },
              "-=0.08",
            );
        },
        rootRef,
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  if (layout === "public") {
    return (
      <div className="public-page" ref={rootRef}>
        {children}
      </div>
    );
  }

  return (
    <div className="auth-stage" ref={rootRef}>
      <div
        className={
          wide ? "auth-compose auth-compose-wide" : "auth-compose auth-compose-static"
        }
      >
        {children}
      </div>
    </div>
  );
}
