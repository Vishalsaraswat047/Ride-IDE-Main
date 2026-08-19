import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none font-medium transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 ride-focus-ring",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:opacity-85 active:opacity-75",
        secondary: "bg-canvas text-ink border border-hairline hover:bg-canvas-soft-2",
        ghost: "bg-transparent text-body hover:bg-canvas-soft-2 hover:text-ink",
        danger: "bg-error text-white hover:opacity-85",
      },
      size: {
        sm: "h-7 px-2 text-[13px] leading-5 font-medium",
        md: "h-9 px-3 text-sm leading-5",
        lg: "h-11 px-5 text-base leading-6",
        icon: "h-7 w-7 p-0",
      },
      shape: {
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        pill: "rounded-pill",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "sm",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, shape }), className)} {...props} />
  ),
);
Button.displayName = "Button";
