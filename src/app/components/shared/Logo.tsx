interface LogoProps {
  size?: "sm" | "md" | "lg";
  textColor?: string;
  /** Зөвхөн тэмдэг (бичиггүй) */
  markOnly?: boolean;
}

const MARK_PX = { sm: 28, md: 32, lg: 40 } as const;
const TEXT_REM = { sm: "1rem", md: "1.1rem", lg: "1.3rem" } as const;

/** Албан ёсны логоны өнгө — accent өнгө сольсон ч энэ хэвээр */
export const BRAND_ORANGE = "#ff6028";

/**
 * Брэндийн тэмдэг — «Дархан хүргэлт» логоны улбар шар дугуй дээрх
 * хурдтай фургон. Бүтэн лого (бичигтэй): /logo-full.png.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Дархан хүргэлт" className={`shrink-0 ${className}`}>
      <circle cx="32" cy="32" r="32" fill={BRAND_ORANGE} />
      <g transform="translate(32 32) scale(1.12) translate(-30.3 -32.8)">
        <g fill="#fff">
          <rect x="8" y="22.5" width="11" height="2.6" rx="1.3" />
          <rect x="11" y="27.2" width="8" height="2.6" rx="1.3" />
          <rect x="6.5" y="31.9" width="12.5" height="2.6" rx="1.3" />
          <rect x="12" y="36.6" width="7" height="2.6" rx="1.3" />
          <path d="M21 20.5h20.5a1.5 1.5 0 0 1 1.5 1.5v18H22.5a1.5 1.5 0 0 1-1.5-1.5z" />
          <path d="M43 25.5h4.6c.7 0 1.3.3 1.7.9l4.3 6.1c.3.4.4.9.4 1.4V39a1 1 0 0 1-1 1H43z" />
        </g>
        <path d="M45 28h2.4l3.4 5H45z" fill={BRAND_ORANGE} />
        <g fill="#fff" stroke={BRAND_ORANGE} strokeWidth="2.2">
          <circle cx="27.5" cy="40.5" r="4.6" />
          <circle cx="47" cy="40.5" r="4.6" />
        </g>
        <circle cx="27.5" cy="40.5" r="1.6" fill={BRAND_ORANGE} />
        <circle cx="47" cy="40.5" r="1.6" fill={BRAND_ORANGE} />
      </g>
    </svg>
  );
}

export function Logo({ size = "md", textColor = "inherit", markOnly = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={MARK_PX[size]} />
      {!markOnly && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: TEXT_REM[size],
            letterSpacing: "-0.02em",
            color: textColor,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          Дархан <span style={{ color: "var(--brand)" }}>хүргэлт</span>
        </span>
      )}
    </div>
  );
}
