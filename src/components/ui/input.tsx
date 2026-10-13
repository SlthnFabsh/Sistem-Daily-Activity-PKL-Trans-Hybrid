import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, ...props }: Props) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-text">{label}</span>
      )}
      <input
        className={clsx(
          "w-full rounded-xl border bg-white px-3 py-2 text-sm text-text outline-none transition-colors",
          "placeholder:text-text-muted/60",
          error ? "border-red-400" : "border-border",
          "focus:border-primary",
          className
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}