import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  asChild?: boolean;
  children?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-[var(--shadow-float)] hover:bg-primary-hover active:bg-primary-strong",
  secondary:
    "border border-border bg-white text-text shadow-sm hover:border-primary/30 hover:bg-primary-soft hover:text-primary",
  danger:
    "border border-danger/30 bg-white text-danger hover:bg-danger-soft",
};

export function Button({
  variant = "primary",
  className,
  asChild,
  children,
  disabled,
  ...props
}: Props) {
  const disabledBool: boolean | undefined =
    disabled == null ? undefined : disabled === true;
  const Comp = (asChild ? "span" : "button") as React.ElementType;
  return (
    <Comp
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        variants[variant],
        className
      )}
      disabled={disabledBool}
      {...props}
    >
      {children}
    </Comp>
  );
}
