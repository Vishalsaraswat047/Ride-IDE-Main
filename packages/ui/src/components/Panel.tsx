import * as React from "react";
import { cn } from "../lib/cn";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, title, actions, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex min-h-0 min-w-0 flex-col bg-canvas", className)}
      {...props}
    >
      {title !== undefined && (
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-hairline px-3">
          <div className="text-[11px] font-medium tracking-wide text-body uppercase">{title}</div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  ),
);
Panel.displayName = "Panel";
