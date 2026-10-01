import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
}

export function formatTime(timestamp: { toDate?: () => Date } | Date | null | undefined): string {
  if (!timestamp) return "";
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate?.() ?? new Date();
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(timestamp: { toDate?: () => Date } | Date | null | undefined): string {
  if (!timestamp) return "";
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate?.() ?? new Date();
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
