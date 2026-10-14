import { clsx } from "clsx";

type Tone = "info" | "error";

const tones: Record<Tone, string> = {
  info: "bg-primary-soft text-primary",
  error: "border border-red-200 bg-white text-red-600",
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
        "rounded-xl px-4 py-2 text-sm",
        tones[tone]
      )}
    >
      {children}
    </div>
  );
}