import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import type { AccountsSummary, AccountType, Transfer } from "../../types";

interface AccountInput {
  name: string;
  type: AccountType;
  opening_balance: string;
  brand?: string | null;
  icon?: string | null;
  color?: string | null;
}

export function useAccounts(includeArchived = false) {
  return useQuery({
    queryKey: ["accounts", includeArchived],
    queryFn: () =>
      api.get<AccountsSummary>(`/accounts${includeArchived ? "?archived=true" : ""}`),
  });
}

// Mutations touch balances/net worth shown across accounts, dashboard and budgets.
function invalidateMoney(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["accounts"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["transactions"] });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AccountInput) => api.post("/accounts", body),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AccountInput> & { archived?: boolean } }) =>
      api.patch(`/accounts/${id}`, body),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/accounts/${id}`),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      from_account_id: string;
      to_account_id: string;
      amount: string;
      occurred_on: string;
      note?: string | null;
    }) => api.post<Transfer>("/accounts/transfers", body),
    onSuccess: () => invalidateMoney(qc),
  });
}
