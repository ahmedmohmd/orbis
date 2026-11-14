"use client";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...p }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root className={cn("inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input transition-colors data-[state=checked]:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...p}>
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}
