import { Delete } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

/** 4-digit PIN keypad used for setup, confirmation and unlocking. */
export function PinEntry({
  title,
  description,
  error,
  busy = false,
  resetKey,
  onSubmit,
  footer,
}: {
  title: string;
  description?: string | undefined;
  error?: string | undefined;
  busy?: boolean | undefined;
  /** Change this to clear the entered digits (e.g. after a wrong PIN). */
  resetKey?: string | number | undefined;
  onSubmit: (pin: string) => void | Promise<void>;
  footer?: ReactNode;
}) {
  const [digits, setDigits] = useState("");

  useEffect(() => {
    setDigits("");
  }, [resetKey]);

  const press = (key: string) => {
    if (busy) return;
    haptic.light();
    if (key === "back") {
      setDigits((current) => current.slice(0, -1));
      return;
    }
    setDigits((current) => {
      if (current.length >= 4) return current;
      const next = current + key;
      if (next.length === 4) void onSubmit(next);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex justify-center gap-3" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "size-4 rounded-full border-2 border-muted-foreground/40 transition-colors",
              index < digits.length && "border-primary bg-primary",
            )}
          />
        ))}
      </div>

      <p
        className={cn("min-h-5 text-center text-sm", error ? "text-destructive" : "text-muted-foreground")}
        role={error ? "alert" : undefined}
      >
        {error ?? ""}
      </p>

      <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
        {KEYS.map((key, index) =>
          key === "" ? (
            <span key={`gap-${index}`} />
          ) : (
            <Button
              key={key}
              type="button"
              variant="secondary"
              disabled={busy}
              aria-label={key === "back" ? "Delete" : key}
              className="press h-14 rounded-2xl text-xl font-medium"
              onClick={() => press(key)}
            >
              {key === "back" ? <Delete className="size-5" aria-hidden /> : key}
            </Button>
          ),
        )}
      </div>

      {footer ? <div className="space-y-2">{footer}</div> : null}
    </div>
  );
}
