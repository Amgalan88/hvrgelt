import { LogoMark } from "./Logo";

interface SpinnerProps {
  className?: string;
}

// Жижиг ачааллын дугуй (Tailwind animate-spin)
export function Spinner({ className = "w-5 h-5" }: SpinnerProps) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`}
      aria-label="Ачааллаж байна"
    />
  );
}

// Бүтэн дэлгэцийн ачааллын төлөв
export function LoadingScreen({ label = "Ачааллаж байна..." }: { label?: string }) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center gap-5">
      <LogoMark size={56} className="animate-pulse" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="w-4 h-4 text-primary" /> {label}
      </div>
    </div>
  );
}
