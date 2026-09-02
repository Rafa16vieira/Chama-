/** Tokens de motion — personalidade Corporate (Chamaí). */
export const motionEase = {
  out: "power2.out",
  in: "power2.in",
  inOut: "power2.inOut",
} as const;

export const motionDuration = {
  micro: 0.12,
  quick: 0.2,
  standard: 0.28,
  slow: 0.4,
} as const;

export const motionOffset = {
  y: 24,
  ySmall: 12,
} as const;

export const motionStagger = {
  tight: 0.05,
  standard: 0.07,
} as const;
