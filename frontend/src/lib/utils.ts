import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatMoney } from "./format";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vnd(value: number | string) {
  return formatMoney(value);
}
