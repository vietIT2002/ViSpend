import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, buildQuery } from "../../lib/api";
import type { BudgetPlan } from "../../types";

export function useBudgetPlan(month: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: () => api.get<BudgetPlan>(buildQuery("/budgets", { month })),
    enabled: Boolean(month),
  });
}

function useBudgetMutation<TBody>(fn: (body: TBody) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpsertBudgetMonth() {
  return useBudgetMutation((body: { month: string; amount: string }) =>
    api.put<BudgetPlan>("/budgets/month", body),
  );
}

export function useUpsertBudgetAllocation() {
  return useBudgetMutation((body: { month: string; category_id: string; amount: string }) =>
    api.put<BudgetPlan>("/budgets/allocations", body),
  );
}

export function useDeleteBudgetAllocation() {
  return useBudgetMutation((id: string) => api.delete<void>(`/budgets/allocations/${id}`));
}

export function useCopyBudgetPlan() {
  return useBudgetMutation((body: { from_month: string; to_month: string }) =>
    api.post<BudgetPlan>("/budgets/copy", body),
  );
}
