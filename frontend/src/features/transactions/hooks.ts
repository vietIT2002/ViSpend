import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, buildQuery } from "../../lib/api";
import type { Paginated, PayMethod, Transaction, TxnType } from "../../types";

export interface TxnFilter {
  type?: TxnType;
  category_id?: string;
  method?: PayMethod;
  from?: string;
  to?: string;
}

export function useTransactions(filter: TxnFilter) {
  return useQuery({
    queryKey: ["transactions", filter],
    queryFn: () => api.get<Paginated<Transaction>>(buildQuery("/transactions", filter)),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Transaction>("/transactions", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Transaction>(`/transactions/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
