import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "../../utils/cn";

export type BadgeTone = "brand" | "success" | "warning" | "danger" | "slate";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
  success: "bg-success-50 text-success-700 ring-success-600/20",
  warning: "bg-warning-50 text-warning-600 ring-warning-600/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function Badge({ children, tone = "slate", icon: Icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />}
      {children}
    </span>
  );
}
