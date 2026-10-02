interface LogoProps {
  size?: "sm" | "md" | "lg";
  textColor?: string;
  /** Зөвхөн тэмдэг (бичиггүй) */
  markOnly?: boolean;
}

const MARK_PX = { sm: 28, md: 32, lg: 40 } as const;
const TEXT_REM = { sm: "1rem", md: "1.1rem", lg: "1.3rem" } as const;

/**
 * Брэндийн тэмдэг — авах цэгээс (цэгэн зам) хүргэх цэг рүү (байршлын тэмдэг).
 * Апп доторх "ногоон цэг → тэмдэг" маршрутын дүрстэй ижил утгатай.
 * Accent өнгө сольсон ч брэндийн улбар шар хэвээр үлдэнэ.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Дархан хүргэлт"
      className={`shrink-0 ${className}`}
    >
      <rect width="64" height="64" rx="18" fill="var(--brand)" />
      <path
        d="M18 46 C18 30 46 36 46 22"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="0.1 9.5"
      />
      <circle cx="18" cy="46" r="6" fill="#fff" />
      <path
        d="M46 10.5c-6.1 0-10.8 4.7-10.8 10.6 0 7.5 10.8 17.2 10.8 17.2s10.8-9.7 10.8-17.2c0-5.9-4.7-10.6-10.8-10.6z"
        fill="#fff"
      />
      <circle cx="46" cy="21.3" r="4.2" fill="var(--brand)" />
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
