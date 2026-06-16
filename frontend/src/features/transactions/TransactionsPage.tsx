import { format } from "date-fns";
import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { IconFlow, IconPencil, IconPlus, IconTrash } from "../../components/icons";
import { vnd } from "../../lib/utils";
import type { Transaction, TxnType } from "../../types";
import { useCategories } from "../categories/hooks";
import { TransactionModal } from "./TransactionModal";
import { useDeleteTransaction, useTransactions, type TxnFilter } from "./hooks";

const PAGE_SIZE = 20;

// Transactions can only be edited/deleted within 24h of being recorded.
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
function isLocked(t: Transaction) {
  return Date.now() - new Date(t.created_at).getTime() > EDIT_WINDOW_MS;
}
const amountClass = (type: TxnType) =>
  type === "income" ? "text-brand-dark" : "text-expense";
const amountText = (t: Transaction) => `${t.type === "income" ? "+" : "-"}${vnd(t.amount)}`;

export function TransactionsPage() {
  const [filter, setFilter] = useState<TxnFilter>({});
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [newType, setNewType] = useState<TxnType>("expense");

  const { data, isLoading } = useTransactions({ ...filter, page, page_size: PAGE_SIZE });
  const { data: cats = [] } = useCategories();
  const del = useDeleteTransaction();
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "Unknown";
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterCats = cats.filter((c) => !filter.type || c.type === filter.type);

  // Reset to the first page whenever the filter changes.
  useEffect(() => {
    setPage(1);
  }, [filter]);

  // Keep the page in range if the result set shrinks (e.g. after deleting).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
                  locked={isLocked(t)}
                  onView={() => setViewing(t)}
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
                  {items.map((t) => {
                    const locked = isLocked(t);
                    return (
                      <tr
                        key={t.id}
                        className="cursor-pointer transition-colors hover:bg-black/[0.015]"
                        onClick={() => setViewing(t)}
                      >
                        <td className="nums px-5 py-3.5 text-charcoal">
                          {format(new Date(t.occurred_on), "dd MMM yyyy")}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-ink">{catName(t.category_id)}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={t.type === "income" ? "green" : "red"}>{t.type}</Badge>
                        </td>
                        <td className="px-5 py-3.5 capitalize text-charcoal">{t.method}</td>
                        <td className={`nums px-5 py-3.5 text-right font-medium ${amountClass(t.type)}`}>
                          {amountText(t)}
                        </td>
                        <td className="px-5 py-3.5">
                          {!locked && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(t);
                                }}
                                title="Edit"
                                aria-label="Edit transaction"
                                className="size-9 px-0"
                              >
                                <IconPencil size={16} />
                              </Button>
                              <Button
                                variant="danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  del.mutate(t.id);
                                }}
                                title="Delete"
                                aria-label="Delete transaction"
                                className="size-9 px-0"
                              >
                                <IconTrash size={16} />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
                <span className="nums text-xs text-muted">
                  {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3"
                  >
                    Prev
                  </Button>
                  <span className="nums text-xs text-muted">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-9 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        defaultType={newType}
      />

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Transaction details">
        {viewing && (
          <div className="space-y-1">
            <DetailRow label="Date" value={format(new Date(viewing.occurred_on), "dd MMM yyyy")} />
            <DetailRow label="Category" value={catName(viewing.category_id)} />
            <DetailRow
              label="Type"
              value={<Badge tone={viewing.type === "income" ? "green" : "red"}>{viewing.type}</Badge>}
            />
            <DetailRow label="Method" value={<span className="capitalize">{viewing.method}</span>} />
            <DetailRow
              label="Amount"
              value={<span className={`nums font-medium ${amountClass(viewing.type)}`}>{amountText(viewing)}</span>}
            />
            <DetailRow label="Note" value={viewing.note?.trim() ? viewing.note : "—"} />
            <DetailRow
              label="Recorded"
              value={<span className="nums">{format(new Date(viewing.created_at), "dd MMM yyyy, HH:mm")}</span>}
            />
            <div className="flex justify-end gap-2 pt-4">
              {!isLocked(viewing) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const t = viewing;
                    setViewing(null);
                    openEdit(t);
                  }}
                >
                  <IconPencil size={16} /> Edit
                </Button>
              )}
              <Button onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-ink">{value}</span>
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
  locked,
  onView,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  category: string;
  locked: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="cursor-pointer p-4" onClick={onView}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{category}</p>
          <p className="nums mt-1 text-xs text-muted">{format(new Date(t.occurred_on), "dd MMM yyyy")}</p>
        </div>
        <p className={`nums shrink-0 text-sm font-medium ${amountClass(t.type)}`}>{amountText(t)}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={t.type === "income" ? "green" : "red"}>{t.type}</Badge>
          <span className="text-xs capitalize text-muted">{t.method}</span>
        </div>
        {!locked && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit"
              className="size-9 px-0"
              aria-label="Edit transaction"
            >
              <IconPencil size={16} />
            </Button>
            <Button
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
              className="size-9 px-0"
              aria-label="Delete transaction"
            >
              <IconTrash size={16} />
            </Button>
          </div>
        )}
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
