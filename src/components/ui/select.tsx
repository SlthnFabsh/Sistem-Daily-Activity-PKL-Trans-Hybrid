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
        <span className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </span>
      )}
      <select
        className={clsx(
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-text shadow-sm outline-none transition-colors",
          error
            ? "border-danger focus:border-danger"
            : "border-border hover:border-primary/40 focus:border-primary",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      )}
    </label>
  );
}
