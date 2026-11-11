import type { Tone } from "../../components/ui/badge";
import type { BudgetAlert } from "../../types";

/** Budget alerts in the five-tone vocabulary (DESIGN.md → Status vocabulary). */
export const ALERT_TONE: Record<BudgetAlert, Tone> = {
  safe: "success",
  watch: "warning",
  tight: "warning",
  over: "danger",
};

export const ALERT_LABEL: Record<BudgetAlert, `budgets.alert.${BudgetAlert}`> = {
  safe: "budgets.alert.safe",
  watch: "budgets.alert.watch",
  tight: "budgets.alert.tight",
  over: "budgets.alert.over",
};

/** Rows that need attention come first. */
export const ALERT_ORDER: Record<BudgetAlert, number> = { over: 0, tight: 1, watch: 2, safe: 3 };
