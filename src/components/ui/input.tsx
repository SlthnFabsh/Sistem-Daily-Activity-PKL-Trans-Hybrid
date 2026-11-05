import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export function Input({ label, error, icon: Icon, className, ...props }: Props) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </span>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <Icon className="h-4 w-4 text-text-muted" />
          </div>
        )}
        <input
          className={clsx(
            "w-full rounded-xl border bg-white py-2.5 text-sm text-text shadow-sm outline-none transition-colors",
            "placeholder:text-text-muted/60",
            Icon ? "pl-10 pr-3.5" : "px-3.5",
            error
              ? "border-danger focus:border-danger"
              : "border-border hover:border-primary/40 focus:border-primary",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      )}
    </label>
  );
}
