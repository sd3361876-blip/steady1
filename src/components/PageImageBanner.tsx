import { cn } from "@/lib/utils";

export function PageImageBanner({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("mb-4 h-32 w-full overflow-hidden rounded-[20px]", className)}>
      <img
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}