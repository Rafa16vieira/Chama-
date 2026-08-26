import Link from "next/link";

export function BrandMark({
  size = "md",
  href = "/",
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
}) {
  const titleClass =
    size === "lg"
      ? "brand-title"
      : size === "sm"
        ? "text-xl font-bold text-brand-deep"
        : "text-2xl font-bold text-brand-deep";

  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        width={size === "lg" ? 56 : 44}
        height={size === "lg" ? 56 : 44}
        className="rounded-[0.9rem]"
      />
      <span
        className={titleClass}
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Chamaí
      </span>
    </>
  );

  if (!href) {
    return <div className="brand-mark">{content}</div>;
  }

  return (
    <Link href={href} className="brand-mark">
      {content}
    </Link>
  );
}
