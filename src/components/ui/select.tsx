import { clsx } from "clsx";
import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export function Select({ label, error, className, children, ...props }: Props) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-text">{label}</span>
      )}
      <select
        className={clsx(
          "w-full rounded-xl border bg-white px-3 py-2 text-sm text-text outline-none transition-colors",
          error ? "border-red-400" : "border-border",
          "focus:border-primary",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}