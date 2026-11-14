import { cn } from "@/lib/utils";
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...p} />;
export const Badge = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => <span className={cn("inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground", className)} {...p} />;
