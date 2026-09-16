import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

/**
 * Small freehand drawing pad used in onboarding. Pointer-events based so it
 * behaves the same on Android/iOS; `touch-none` keeps the page from scrolling
 * while a finger is drawing, and only inside the pad.
 */
export function CommitmentCanvas({
  onChange,
  className,
  clearLabel = "Clear drawing",
}: {
  onChange?: (dataUrl: string | null) => void;
  className?: string;
  clearLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const prepare = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#111111";
    return ctx;
  }, []);

  useEffect(() => {
    prepare();
  }, [prepare]);

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const emit = () => {
    if (!onChange) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      onChange(canvas.toDataURL("image/png"));
    } catch {
      onChange(null);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        aria-label="Drawing area"
        className="h-52 w-full touch-none rounded-3xl border border-border bg-white"
        onPointerDown={(event) => {
          const ctx = prepare();
          if (!ctx) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const { x, y } = pointFrom(event);
          drawing.current = true;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.01, y);
          ctx.stroke();
          if (!hasStrokes) setHasStrokes(true);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          const { x, y } = pointFrom(event);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          emit();
        }}
        onPointerCancel={() => {
          drawing.current = false;
          emit();
        }}
      />
      {hasStrokes ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            haptic.light();
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasStrokes(false);
            onChange?.(null);
          }}
          className="press absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-muted text-foreground shadow-sm"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
