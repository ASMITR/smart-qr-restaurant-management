import { cn } from "@/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "secondary";

const variants: Record<BadgeVariant, string> = {
  default: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  success: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  danger: "bg-red-100 text-red-700 ring-1 ring-red-200",
  info: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  secondary: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

const dots: Record<BadgeVariant, string> = {
  default: "bg-orange-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  secondary: "bg-gray-400",
};

export function Badge({
  children,
  variant = "default",
  className,
  dot = false,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", variants[variant], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dots[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    AVAILABLE: "success", OCCUPIED: "warning", PAYMENT_PENDING: "danger", CLEANING: "info",
    PLACED: "info", ACCEPTED: "default", PREPARING: "warning", READY: "success",
    SERVED: "secondary", COMPLETED: "secondary", CANCELLED: "danger",
    ACTIVE: "success", PENDING: "warning", PAID: "success", FAILED: "danger",
  };
  const variant = map[status] ?? "secondary";
  return <Badge variant={variant} dot>{status.replace(/_/g, " ")}</Badge>;
}
