import type { ReactNode } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { LogoMark } from "./Logo";

/** Толгой хэсгийн icon товч — утсан дээр хуруугаар дарахад хангалттай 36px */
export const HEADER_ICON_BTN =
  "w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40";

export function HeaderIconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={HEADER_ICON_BTN}>
      {children}
    </button>
  );
}

interface RoleHeaderProps {
  /** Хэрэглэгч эсвэл байгууллагын нэр */
  title: string;
  /** Role, үнэлгээ гэх мэт нэмэлт мөр */
  subtitle?: ReactNode;
  /** Агуулгын өргөнтэй тааруулна */
  width?: "sm" | "2xl";
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLogout: () => void;
  /** Горим, гарах товчны өмнө орох нэмэлт товчнууд */
  children?: ReactNode;
}

/**
 * Хүргэгч, оператор, партнёр, супер админы апп-ын нийтлэг толгой.
 * Өмнө нь апп бүр өөр өөр бүтэцтэй, icon-ууд padding-гүй 16px байв.
 */
export function RoleHeader({ title, subtitle, width = "sm", theme, onToggleTheme, onLogout, children }: RoleHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className={`${width === "2xl" ? "max-w-2xl" : "max-w-sm"} mx-auto px-4 py-2.5 flex items-center gap-3`}>
        <LogoMark size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight truncate">{title}</p>
          {subtitle && <div className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{subtitle}</div>}
        </div>
        <div className="flex items-center shrink-0 -mr-1.5">
          {children}
          <HeaderIconButton onClick={onToggleTheme} label={theme === "dark" ? "Цайвар горим" : "Харанхуй горим"}>
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </HeaderIconButton>
          <HeaderIconButton onClick={onLogout} label="Гарах">
            <LogOut className="w-[18px] h-[18px]" />
          </HeaderIconButton>
        </div>
      </div>
    </header>
  );
}
