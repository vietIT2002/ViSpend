import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, buildQuery } from "../../lib/api";
import type { Paginated, ParseSuggestion, PayMethod, Transaction, TxnType } from "../../types";

export interface TxnFilter {
  type?: TxnType;
  category_id?: string;
  method?: PayMethod;
  account_id?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export function useTransactions(filter: TxnFilter, options: { enabled?: boolean; keepPrevious?: boolean } = {}) {
  return useQuery({
    queryKey: ["transactions", filter],
    queryFn: () => api.get<Paginated<Transaction>>(buildQuery("/transactions", filter)),
    enabled: options.enabled ?? true,
    // A new page or filter keeps the old rows (dimmed) instead of flashing a skeleton.
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Transaction>("/transactions", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
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
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
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
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useParseText() {
  return useMutation({
    mutationFn: (text: string) => api.post<ParseSuggestion>("/transactions/parse", { text }),
  });
}

export function useUploadReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: Blob }) => {
      const form = new FormData();
      form.append("file", file, "receipt.jpg");
      return api.post<Transaction>(`/transactions/${id}/receipt`, form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}
