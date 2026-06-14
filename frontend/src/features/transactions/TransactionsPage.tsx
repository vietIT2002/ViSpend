import { format } from "date-fns";
import { useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { IconFlow, IconPencil, IconPlus, IconTrash } from "../../components/icons";
import { vnd } from "../../lib/utils";
import type { Transaction, TxnType } from "../../types";
import { useCategories } from "../categories/hooks";
import { TransactionModal } from "./TransactionModal";
import { useDeleteTransaction, useTransactions, type TxnFilter } from "./hooks";

export function TransactionsPage() {
  const [filter, setFilter] = useState<TxnFilter>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [newType, setNewType] = useState<TxnType>("expense");

  const { data, isLoading } = useTransactions(filter);
  const { data: cats = [] } = useCategories();
  const del = useDeleteTransaction();
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "Unknown";
  const items = data?.items ?? [];
  const filterCats = cats.filter((c) => !filter.type || c.type === filter.type);

  function openAdd(type: TxnType) {
    setEditing(null);
    setNewType(type);
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Ledger</p>
          <h1 className="display text-3xl text-ink sm:text-4xl">Record money in and out fast.</h1>
          <p className="text-sm text-muted">Filter by type, category, and date without leaving the ledger.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={() => openAdd("expense")}>
            <IconPlus size={16} /> Expense
          </Button>
          <Button variant="secondary" onClick={() => openAdd("income")}>
            <IconPlus size={16} /> Income
          </Button>
        </div>
      </header>

      <Card className="p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[150px_190px_1fr_auto_1fr_auto] lg:items-center">
          <Select
            value={filter.type ?? ""}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                type: (e.target.value || undefined) as TxnType | undefined,
                category_id: undefined,
              }))
            }
          >
            <option value="">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
          <Select
            value={filter.category_id ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, category_id: e.target.value || undefined }))}
          >
            <option value="">All categories</option>
            {filterCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            className="nums"
            aria-label="From date"
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value || undefined }))}
          />
          <span className="hidden text-sm text-muted lg:inline">to</span>
          <Input
            type="date"
            className="nums"
            aria-label="To date"
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value || undefined }))}
          />
          {data && (
            <span className="nums text-sm text-muted lg:text-right">
              {data.total} {data.total === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TransactionSkeleton />
        ) : items.length === 0 ? (
          <EmptyTransactions onAdd={() => openAdd("expense")} />
        ) : (
          <>
            <div className="divide-y divide-line md:hidden">
              {items.map((t) => (
                <TransactionMobileCard
                  key={t.id}
                  transaction={t}
                  category={catName(t.category_id)}
                  onEdit={() => openEdit(t)}
                  onDelete={() => del.mutate(t.id)}
                />
              ))}
            </div>

            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Method</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-black/[0.015]">
                      <td className="nums px-5 py-3.5 text-charcoal">
                        {format(new Date(t.occurred_on), "dd MMM yyyy")}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-ink">{catName(t.category_id)}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={t.type === "income" ? "green" : "red"}>{t.type}</Badge>
                      </td>
                      <td className="px-5 py-3.5 capitalize text-charcoal">{t.method}</td>
                      <td
                        className={`nums px-5 py-3.5 text-right font-medium ${
                          t.type === "income" ? "text-brand-dark" : "text-ink"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {vnd(t.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            onClick={() => openEdit(t)}
                            title="Edit"
                            aria-label="Edit transaction"
                            className="size-9 px-0"
                          >
                            <IconPencil size={16} />
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => del.mutate(t.id)}
                            title="Delete"
                            aria-label="Delete transaction"
                            className="size-9 px-0"
                          >
                            <IconTrash size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        defaultType={newType}
      />
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid gap-3 md:grid-cols-[120px_1fr_90px_110px_120px]">
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
        </div>
      ))}
    </div>
  );
}

function TransactionMobileCard({
  transaction: t,
  category,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  category: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{category}</p>
          <p className="nums mt-1 text-xs text-muted">{format(new Date(t.occurred_on), "dd MMM yyyy")}</p>
        </div>
        <p className={`nums shrink-0 text-sm font-medium ${t.type === "income" ? "text-brand-dark" : "text-ink"}`}>
          {t.type === "income" ? "+" : "-"}
          {vnd(t.amount)}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={t.type === "income" ? "green" : "red"}>{t.type}</Badge>
          <span className="text-xs capitalize text-muted">{t.method}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" onClick={onEdit} className="size-9 px-0" aria-label="Edit transaction">
            <IconPencil size={16} />
          </Button>
          <Button variant="danger" onClick={onDelete} className="size-9 px-0" aria-label="Delete transaction">
            <IconTrash size={16} />
          </Button>
        </div>
      </div>
    </article>
  );
}

function EmptyTransactions({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-11 place-items-center rounded-lg border border-line text-muted">
        <IconFlow size={20} />
      </span>
      <div>
        <p className="font-medium text-ink">Nothing recorded yet</p>
        <p className="max-w-xs text-sm text-muted">Add your first expense or income to start the ledger.</p>
      </div>
      <Button onClick={onAdd}>
        <IconPlus size={16} /> Add expense
      </Button>
    </div>
  );
}
