export type TxnType = "expense" | "income";
export type PayMethod = "cash" | "transfer" | "card";

export interface User {
  id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  is_verified: boolean;
  is_google: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TxnType;
  icon: string | null;
  color: string | null;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  type: TxnType;
  amount: string;
  category_id: string;
  occurred_on: string;
  method: PayMethod;
  note: string | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardSummary {
  total_income: string;
  total_expense: string;
  balance: string;
}

export interface CategoryTotal {
  category: string;
  total: string;
  percent: number;
}

export interface TrendPoint {
  period: string;
  income: string;
  expense: string;
}

export interface CategorySpend {
  category_id: string;
  category: string;
  color: string | null;
  total: string;
  percent: number;
  prev_total: string;
}

export type BudgetAlert = "safe" | "watch" | "tight" | "over";

export interface BudgetAllocationStatus {
  id: string;
  category_id: string;
  category: string;
  color: string | null;
  amount: string;
  spent: string;
  remaining: string;
  usage_percent: number;
  alert: BudgetAlert;
}

export interface BudgetPlan {
  month: string;
  monthly_budget: string;
  available_money: string;
  allocated_total: string;
  unallocated_amount: string;
  total_spent: string;
  total_remaining: string;
  total_usage_percent: number;
  total_alert: BudgetAlert;
  alerts: Record<BudgetAlert, number>;
  items: BudgetAllocationStatus[];
}
