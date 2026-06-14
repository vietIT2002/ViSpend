import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vnd(value: number | string) {
  return `${Number(value).toLocaleString("en-US")} VND`;
}
