import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  asChild?: boolean;
  children?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-border bg-white text-text hover:bg-primary-soft",
  danger: "border border-red-200 text-red-600 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className,
  asChild,
  children,
  disabled,
  ...props
}: Props) {
  const disabledBool: boolean | undefined = disabled == null ? undefined : disabled === true;
  const Comp = (asChild ? "span" : "button") as React.ElementType;
  return (
    <Comp
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
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