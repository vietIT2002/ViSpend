import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vnd(value: number | string) {
  // VND has no sub-unit — always show whole dong (no decimals), even for
  // computed values like daily pace (e.g. 912000/9 must not render "...333").
  return `${Math.round(Number(value)).toLocaleString("en-US", { maximumFractionDigits: 0 })} VND`;
}
