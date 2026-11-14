import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

export const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "report";
