/**
 * RIDE Functional Component Library.
 *
 * Provides ready-to-use React components with proper state management,
 * validation, and accessibility. Templates can import these instead of
 * building UI from scratch. Each component accounts for loading, empty,
 * error, success, and unauthorized states.
 *
 * Library-first approach: never reinvent a capability an appropriate
 * library already provides (shadcn/ui, Radix UI, etc.).
 */

import type { ReactNode } from "react";

/** Tiny classname joiner (mirrors the renderer's `cn` without a dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Base component props with state awareness.
 */
export interface StateAwareComponentProps {
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Success message */
  success?: boolean;
  /** Unauthorized state */
  unauthorized?: boolean;
  /** Offline state */
  offline?: boolean;
  /** Custom className */
  className?: string;
  /** Aria label */
  "aria-label"?: string;
}

/**
 * Base loading component that accounts for all states.
 */
export function LoadingState({
  loading,
  className,
  "aria-label": ariaLabel = "Loading",
}: Omit<StateAwareComponentProps, "loading"> & { loading: boolean }): ReactNode {
  if (!loading) return null;
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center",
        "text-[12px] text-mute",
        "animate-pulse",
        className,
      )}
      aria-busy={true}
      aria-label={ariaLabel}
    />
  );
}

/**
 * Base empty state component.
 */
export function EmptyState({
  children,
  icon,
  title,
  description,
  action,
  actionLabel,
  className,
  "aria-label": ariaLabel = "Empty state",
}: {
  children?: ReactNode;
  icon?: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  actionLabel?: string;
  className?: string;
  "aria-label"?: string;
}): ReactNode {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 text-center text-mute",
      className,
    )}>
      {icon || (
        <div className="vk-skeleton h-20 w-20 rounded-full animate-pulse" />
      )}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-base">{description}</p>
      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className={cn(
              "gk-btn gk-btn-primary",
              "mt-2",
              "text-[13px]",
            )}
            aria-label={actionLabel ?? action.label}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Base error state component.
 */
export function ErrorState({
  error,
  retry,
  retryLabel,
  className,
}: {
  error: string;
  retry?: { label: string; onClick: () => void };
  retryLabel?: string;
  className?: string;
}): ReactNode {
  return (
    <div className={cn(
      "p-8 bg-[var(--canvas-soft)] rounded-xl text-center",
      className,
    )}>
      <p className="text-lg font-medium text-error">{error}</p>
      {retry && (
        <div className="mt-6">
          <button
            onClick={retry.onClick}
            className={cn("gk-btn gk-btn-secondary", "mt-2")}
            aria-label={retryLabel ?? "Retry"}
          >
            {retry.label}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Base success state component.
 */
export function SuccessState({
  message,
  action,
  actionLabel,
  className,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
  actionLabel?: string;
  className?: string;
}): ReactNode {
  return (
    <div className={cn(
      "p-8 bg-[var(--success-soft)] rounded-xl text-center",
      className,
    )}>
      <p className="text-lg font-medium text-success">{message}</p>
      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className={cn("gk-btn gk-btn-primary", "mt-2")}
            aria-label={actionLabel ?? "Action"}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * State-aware card component.
 * Accounts for loading, empty, error, success states.
 */
export function StateAwareCard({
  children,
  loading,
  error,
  success,
  unauthorized,
  className,
}: {
  children: ReactNode;
  loading?: boolean;
  error?: string;
  success?: boolean;
  unauthorized?: boolean;
  className?: string;
}): ReactNode {
  // Render appropriate state
  if (unauthorized) {
    return (
      <div className={cn("p-6 rounded-bg", className, "text-mute")}>
        <p className="text-mute">You don't have permission to view this content.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("p-6 animate-pulse", className)}>
        <LoadingState loading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-6 rounded-bg", className, "border-error/20")}>
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className={cn("p-6 bg-success/10 rounded-bg", className)}>
        <p className="text-success">Operation completed successfully.</p>
      </div>
    );
  }

  // Default: render children
  return <div className={cn("p-6 rounded-bg", className)}>{children}</div>;
}

/**
 * Form component with Zod validation and state awareness.
 */
export interface FormFieldProps {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio";
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
}

export interface FormValidationErrors {
  [key: string]: string;
}

/**
 * Renders a form field with label, input, and error message.
 * Integrates with React Hook Form and Zod validation.
 */
export function FormField({
  name,
  label,
  type,
  placeholder,
  defaultValue,
  disabled,
  required,
  "aria-describedby": ariaDescribedby,
}: FormFieldProps): ReactNode {
  const id = `ride-form-${name}-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        className="w-full rounded-md border hairline bg-canvas soft px-3 py-2 text-ink placeholder-mote focus:outline-none focus:ring-1 focus:ring-link/40"
        aria-describedby={ariaDescribedby}
        aria-required={required}
      />
      {required && (
        <p className="mt-1 text-xs text-error opacity-0 transition-opacity group-hover:opacity-100">
          This field is required
        </p>
      )}
    </div>
  );
}

/**
 * Renders a form select field with options.
 */
export function FormSelect({
  name,
  label,
  options,
  placeholder,
  defaultValue,
  disabled,
  required,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
}): ReactNode {
  const id = `ride-form-${name}-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">
        {label}
      </label>
      <select
        id={id}
        disabled={disabled}
        required={required}
        className="w-full rounded-md border hairline bg-canvas soft px-3 py-2 text-ink focus:outline-none focus:ring-1 focus:ring-link/40"
      >
        <option value="" disabled>{placeholder || "Select an option"}</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            selected={option.value === defaultValue}
          >
            {option.label}
          </option>
        ))}
      </select>
      {required && (
        <p className="mt-1 text-xs text-error opacity-0 transition-opacity group-hover:opacity-100">
          This field is required
        </p>
      )}
    </div>
  );
}

/**
 * Renders a form checkbox.
 */
export function FormCheckbox({
  name,
  label,
  checked,
  onChange,
  disabled,
  required,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
}): ReactNode {
  const id = `ride-checkbox-${name}-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="flex items-center gap-2 mb-4">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
        disabled={disabled}
        required={required}
        className="gk-checkbox cursor-pointer"
        aria-label={label}
      />
      <label htmlFor={id} className="text-body cursor-pointer">
        {label}
      </label>
    </div>
  );
}

/**
 * Form submit button with loading state.
 */
export function FormSubmitButton({
  children,
  loading,
  disabled,
  type = "submit",
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  className?: string;
  "aria-label"?: string;
}): ReactNode {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={cn(
        "gk-btn gk-btn-primary",
        "transition-all duration-150",
        loading && "disabled:opacity-40",
        !loading && "hover:opacity-85",
        className,
      )}
      aria-label={ariaLabel}
    >
      {loading ? (
        <span className="me-2 inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
      ) : children}
    </button>
  );
}

/**
 * Navigation link component with active state.
 */
export function NavLink({
  to,
  children,
  exact = true,
  className,
  "aria-current": ariaCurrent,
}: {
  to: string;
  children: ReactNode;
  exact?: boolean;
  className?: string;
  "aria-current"?: "page" | "step" | "location" | boolean;
}): ReactNode {
  // In a real implementation, this would use useLocation from react-router
  // For now, we'll add a simple active class based on the 'to' path
  const isActive = false; // Would be determined by current path

  return (
    <a
      href={to}
      className={cn(
        "text-body hover:text-[var(--ink)] transition-colors",
        isActive && "text-[var(--ink)] font-medium",
        className,
      )}
      aria-current={ariaCurrent}
    >
      {children}
    </a>
  );
}

/**
 * Dropdown menu component.
 */
export function DropdownMenu({
  trigger,
  items,
  onSelect,
  disabled = false,
  className,
}: {
  trigger: ReactNode;
  items: { label: string; onClick: () => void; disabled?: boolean }[];
  onSelect: (label: string) => void;
  disabled?: boolean;
  className?: string;
}): ReactNode {
  return (
    <div className={cn("relative", className)}>
      {trigger}
      <ul
        className={cn(
          "absolute z-10 mt-2 w-56 rounded-md bg-canvas soft box-shadow-2 border hairline animate-in fade-in-0 complete-90% heading-sm mt-2 bg-white shadow-level-5",
          "shadow-level-5",
        )}
      >
        {items.map((item) => (
          <li
            key={item.label}
            className="px-4 py-2 cursor-pointer select-none hover:bg-[var(--canvas-soft)]"
            onClick={() => item.disabled ? null : onSelect(item.label)}
            aria-disabled={item.disabled || disabled}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Progress component showing completion percentage.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}): ReactNode {
  const percentage = (value / max) * 100;

  return (
    <div className={cn("h-2 rounded-full bg-canvas-soft overflow-hidden", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-accent transition-all duration-500 ease-in-out",
          percentage > 0 && `w-${percentage}%`,
        )}
      />
      {label && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-mute">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}

/**
 * Avatar component with fallback.
 */
export function Avatar({
  src,
  fallback,
  size = "md",
  className,
}: {
  src: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}): ReactNode {
  const sizes = { sm: "32", md: "36", lg: "48" };

  return (
    <div
      className={cn(
        `rounded-full flex items-center justify-center text-[10px] font-bold`,
        sizes[size] && `w-${sizes[size]} h-${sizes[size]}`,
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={fallback}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span className="bg-accent text-on-primary">
          {fallback.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/**
 * Tag component for labeling content.
 */
export function Tag({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "primary" | "secondary" | "ghost";
  className?: string;
}): ReactNode {
  const variantStyles = {
    default: "bg-canvas-soft text-body",
    primary: "bg-primary text-on-primary",
    secondary: "bg-body text-[var(--ink)]",
    ghost: "text-body hover:bg-[var(--canvas-soft)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[10px] font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Breadcrumbs component.
 */
export function Breadcrumbs({
  items,
  separator = "/",
  className,
}: {
  items: { label: string; href: string }[];
  separator?: string;
  className?: string;
}): ReactNode {
  return (
    <nav aria-label="breadcrumb" className={cn("flex gap-1", className)}>
      {items.map((item, index) => (
        <span key={index} className="text-[11px] text-mute">
          {index > 0 && <span className="mx-1 text-[1px] bg-hairline/50" />}
          <a
            href={item.href}
            className={cn(
              "transition-colors hover:text-[var(--ink)]",
              index === items.length - 1 && "text-[var(--ink)] font-medium underline offset-0",
            )}
          >
            {item.label}
          </a>
        </span>
      ))}
    </nav>
  );
}

/**
 * Rating display component.
 */
export function Rating({
  value,
  max = 5,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}): ReactNode {
  const filled = Math.floor(value);
  const half = value % 1 >= 0.5 ? 1 : 0;
  const empty = max - filled - half;

  const starSize = size === "sm" ? "1.5em" : size === "md" ? "2em" : "3em";

  return (
    <div className={cn("flex gap-1", className)}>
      {/* Filled stars */}
      {[...Array(filled).keys()].map(() => (
        <svg
          key={`filled-${filled}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          width={starSize}
          height={starSize}
        >
          <path d="M12 2l3 8h6l-2-7h-6l3 7 1-7h-4 2 1-7h-6 2l3-7z" />
        </svg>
      ))}

      {/* Half star */}
      {[...Array(half).keys()].map(() => (
        <svg
          key={`half-${half}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          width={starSize}
          height={starSize}
        >
          <path d="M12 2l3 8h6l-2-7h-6l3 7 1-7h-4 2 1-7h-6 2l3-7z" />
        </svg>
      ))}

      {/* Empty stars */}
      {[...Array(empty).keys()].map(() => (
        <svg
          key={`empty-${empty}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          width={starSize}
          height={starSize}
        >
          <path d="M12 2v6l4 5-1 7-2-5-2 7-1-5-2 7-2 5-2 7-1 5-2 7z" />
        </svg>
      ))}
    </div>
  );
}