import { clsx } from "clsx";

type Tone = "info" | "error";

const tones: Record<Tone, string> = {
  info: "border border-primary/15 bg-primary-soft text-primary-strong",
  error: "border border-danger/20 bg-danger-soft text-danger",
};

export function Notice({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl px-4 py-2.5 text-sm font-medium",
        tones[tone]
      )}
    >
      {children}
    </div>
  );
}
