import { clsx } from "clsx";

type Tone = "primary" | "neutral";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  neutral: "bg-slate-100 text-text-muted",
};

export function Badge({
  tone = "primary",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}