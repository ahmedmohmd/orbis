import { cn } from "@/lib/utils";

/** Consistent page title block used by every page inside the app. */
export function PageHeader({ title, description, icon, actions, className }: { title: string; description?: string; icon?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex items-center gap-4">
        {icon && <span className="brand-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-blue-500/20">{icon}</span>}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">{title}</h1>
          {description && <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
      <rect width="48" height="48" rx="14" fill="url(#lg)" />
      <circle cx="24" cy="24" r="8.5" fill="#fff" />
      <ellipse cx="24" cy="24" rx="17" ry="7.5" transform="rotate(-28 24 24)" fill="none" stroke="#fff" strokeWidth="2.2" opacity=".9" />
      <circle cx="37.2" cy="16.4" r="3.4" fill="#fbbf24" />
    </svg>
  );
}
