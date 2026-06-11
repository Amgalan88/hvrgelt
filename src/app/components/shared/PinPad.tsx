import { useState, useEffect } from "react";
import { Delete } from "lucide-react";

interface PinPadProps {
  title: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  error?: string;
}

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

export function PinPad({ title, subtitle, onComplete, onCancel, error }: PinPadProps) {
  const [pin, setPin] = useState("");
  const PIN_LENGTH = 4;

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      onComplete(pin);
      setTimeout(() => setPin(""), 300);
    }
  }, [pin]);

  function press(key: string) {
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < PIN_LENGTH) {
      setPin((p) => p + key);
    }
  }

  return (
    <div className="flex flex-col items-center px-6 py-8 w-full max-w-xs mx-auto">
      {/* Title */}
      <h2 className="mb-1" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.3rem" }}>
        {title}
      </h2>
      {subtitle && <p className="text-sm text-muted-foreground mb-6 text-center">{subtitle}</p>}

      {/* Dots */}
      <div className="flex gap-4 mb-6">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? "bg-primary border-primary scale-110"
                : "bg-transparent border-muted-foreground/40"
            } ${error ? "border-red-400 bg-red-400" : ""}`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 mb-4 text-center">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {KEYS.map((key, i) => {
          if (key === "") return <div key={i} />;
          return (
            <button
              key={i}
              onClick={() => press(key)}
              disabled={key !== "⌫" && pin.length === PIN_LENGTH}
              className={`h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                key === "⌫"
                  ? "bg-transparent text-muted-foreground hover:text-foreground"
                  : "bg-card border border-border text-foreground hover:bg-secondary hover:border-primary/30"
              }`}
              style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 600, fontSize: key === "⌫" ? "1rem" : "1.4rem" }}
            >
              {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
            </button>
          );
        })}
      </div>

      {onCancel && (
        <button onClick={onCancel} className="mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Болих
        </button>
      )}
    </div>
  );
}
