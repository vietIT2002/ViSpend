import type { Account, AccountType } from "../../types";

// Fallback emoji per account type when the user hasn't picked a custom one.
export const TYPE_EMOJI: Record<AccountType, string> = {
  cash: "💵",
  bank: "🏦",
  ewallet: "📱",
  credit: "💳",
};

export function accountEmoji(acc: Pick<Account, "icon" | "type">): string {
  return acc.icon || TYPE_EMOJI[acc.type];
}

export const ACCOUNT_TYPES: AccountType[] = ["cash", "bank", "ewallet", "credit"];
