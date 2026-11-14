"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description, ...p }: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-card p-5 shadow-2xl", className)} {...p}>
        <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description ?? ""}</DialogPrimitive.Description>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="size-4" /></DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
