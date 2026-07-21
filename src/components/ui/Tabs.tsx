import { LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1",
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150",
              active
                ? "bg-white text-brand-700 shadow-card"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" strokeWidth={2.25} />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
