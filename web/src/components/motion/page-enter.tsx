"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motionDuration, motionEase, motionStagger } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function PageEnter({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduceMotion) return;

          const targets = rootRef.current?.children;
          if (!targets?.length) return;

          gsap.from(targets, {
            autoAlpha: 0,
            y: 18,
            duration: motionDuration.standard,
            stagger: motionStagger.standard,
            ease: motionEase.out,
          });
        },
        rootRef,
      );

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [pathname], revertOnUpdate: true },
  );

  return (
    <div ref={rootRef} className="motion-page">
      {children}
    </div>
  );
}
