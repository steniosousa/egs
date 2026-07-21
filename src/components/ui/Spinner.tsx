import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

interface SpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-9 w-9",
};

export function Spinner({ label, size = "md", className }: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 text-brand-600", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
    </div>
  );
}
