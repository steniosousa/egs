import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "slate";
  className?: string;
}

const toneClasses: Record<NonNullable<SectionHeaderProps["tone"]>, string> = {
  brand: "bg-brand-100 text-brand-600",
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
  slate: "bg-slate-100 text-slate-600",
};

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  tone = "brand",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            toneClasses[tone]
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
