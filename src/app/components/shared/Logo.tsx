interface LogoProps {
  size?: "sm" | "md" | "lg";
  textColor?: string;
}

export function Logo({ size = "md", textColor = "inherit" }: LogoProps) {
  const iconSize = { sm: "w-7 h-7", md: "w-8 h-8", lg: "w-10 h-10" }[size];
  const fontSize = { sm: "0.95rem", md: "1.05rem", lg: "1.25rem" }[size];

  return (
    <div className="flex items-center gap-2">
      <img
        src="/favicon.svg"
        alt="Дархан хүргэлт"
        className={`${iconSize} rounded-lg shrink-0`}
      />
      <span
        style={{
          fontFamily: "'Roboto Slab', serif",
          fontWeight: 900,
          fontSize,
          color: textColor,
          lineHeight: 1,
        }}
      >
        Дархан <span style={{ color: "#ff5a1f" }}>хүргэлт</span>
      </span>
    </div>
  );
}
