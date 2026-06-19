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
import { useCategoryLabel, useT } from "../../lib/i18n";
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
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const catName = (id: string) => {
    const c = cats.find((c) => c.id === id);
    return c ? categoryLabel(c) : t("txn.unknown");
  };
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
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{t("txn.ledger")}</p>
          <h1 className="display text-3xl text-ink sm:text-4xl">{t("txn.title")}</h1>
          <p className="text-sm text-muted">{t("txn.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={() => openAdd("expense")}>
            <IconPlus size={16} /> {t("type.expense")}
          </Button>
          <Button variant="secondary" onClick={() => openAdd("income")}>
            <IconPlus size={16} /> {t("type.income")}
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
            <option value="">{t("txn.allTypes")}</option>
            <option value="expense">{t("type.expense")}</option>
            <option value="income">{t("type.income")}</option>
          </Select>
          <Select
            value={filter.category_id ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, category_id: e.target.value || undefined }))}
          >
            <option value="">{t("txn.allCategories")}</option>
            {filterCats.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(c)}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            className="nums"
            aria-label={t("txn.fromDate")}
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value || undefined }))}
          />
          <span className="hidden text-sm text-muted lg:inline">{t("period.to")}</span>
          <Input
            type="date"
            className="nums"
            aria-label={t("txn.toDate")}
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value || undefined }))}
          />
          {data && (
            <span className="nums text-sm text-muted lg:text-right">
              {t(data.total === 1 ? "txn.entriesOne" : "txn.entriesOther", { count: data.total })}
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
              {items.map((txn) => (
                <TransactionMobileCard
                  key={txn.id}
                  transaction={txn}
                  category={catName(txn.category_id)}
                  locked={isLocked(txn)}
                  onView={() => setViewing(txn)}
                  onEdit={() => openEdit(txn)}
                  onDelete={() => del.mutate(txn.id)}
                />
              ))}
            </div>

            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t("txn.colDate")}</th>
                    <th className="px-5 py-3 font-medium">{t("txn.colCategory")}</th>
                    <th className="px-5 py-3 font-medium">{t("txn.colType")}</th>
                    <th className="px-5 py-3 font-medium">{t("txn.colMethod")}</th>
                    <th className="px-5 py-3 text-right font-medium">{t("txn.colAmount")}</th>
                    <th className="px-5 py-3 text-right font-medium">
                      <span className="sr-only">{t("txn.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((txn) => {
                    const locked = isLocked(txn);
                    return (
                      <tr
                        key={txn.id}
                        className="cursor-pointer transition-colors hover:bg-black/[0.015]"
                        onClick={() => setViewing(txn)}
                      >
                        <td className="nums px-5 py-3.5 text-charcoal">
                          {format(new Date(txn.occurred_on), "dd MMM yyyy")}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-ink">{catName(txn.category_id)}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={txn.type === "income" ? "green" : "red"}>{t(`type.${txn.type}`)}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-charcoal">{t(`method.${txn.method}`)}</td>
                        <td className={`nums px-5 py-3.5 text-right font-medium ${amountClass(txn.type)}`}>
                          {amountText(txn)}
                        </td>
                        <td className="px-5 py-3.5">
                          {!locked && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(txn);
                                }}
                                title={t("common.edit")}
                                aria-label={t("txn.editAria")}
                                className="size-9 px-0"
                              >
                                <IconPencil size={16} />
                              </Button>
                              <Button
                                variant="danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  del.mutate(txn.id);
                                }}
                                title={t("common.delete")}
                                aria-label={t("txn.deleteAria")}
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
                  {t("txn.rangeOf", {
                    start: (page - 1) * PAGE_SIZE + 1,
                    end: Math.min(page * PAGE_SIZE, total),
                    total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3"
                  >
                    {t("common.prev")}
                  </Button>
                  <span className="nums text-xs text-muted">
                    {t("txn.pageOf", { page, pages: totalPages })}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-9 px-3"
                  >
                    {t("common.next")}
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

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={t("txn.details")}>
        {viewing && (
          <div className="space-y-1">
            <DetailRow label={t("txn.detailDate")} value={format(new Date(viewing.occurred_on), "dd MMM yyyy")} />
            <DetailRow label={t("txn.detailCategory")} value={catName(viewing.category_id)} />
            <DetailRow
              label={t("txn.detailType")}
              value={<Badge tone={viewing.type === "income" ? "green" : "red"}>{t(`type.${viewing.type}`)}</Badge>}
            />
            <DetailRow label={t("txn.detailMethod")} value={t(`method.${viewing.method}`)} />
            <DetailRow
              label={t("txn.detailAmount")}
              value={<span className={`nums font-medium ${amountClass(viewing.type)}`}>{amountText(viewing)}</span>}
            />
            <DetailRow label={t("txn.detailNote")} value={viewing.note?.trim() ? viewing.note : "—"} />
            <DetailRow
              label={t("txn.detailRecorded")}
              value={<span className="nums">{format(new Date(viewing.created_at), "dd MMM yyyy, HH:mm")}</span>}
            />
            <div className="flex justify-end gap-2 pt-4">
              {!isLocked(viewing) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const target = viewing;
                    setViewing(null);
                    openEdit(target);
                  }}
                >
                  <IconPencil size={16} /> {t("common.edit")}
                </Button>
              )}
              <Button onClick={() => setViewing(null)}>{t("common.close")}</Button>
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
  transaction: txn,
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
  const t = useT();
  return (
    <article className="cursor-pointer p-4" onClick={onView}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{category}</p>
          <p className="nums mt-1 text-xs text-muted">{format(new Date(txn.occurred_on), "dd MMM yyyy")}</p>
        </div>
        <p className={`nums shrink-0 text-sm font-medium ${amountClass(txn.type)}`}>{amountText(txn)}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={txn.type === "income" ? "green" : "red"}>{t(`type.${txn.type}`)}</Badge>
          <span className="text-xs text-muted">{t(`method.${txn.method}`)}</span>
        </div>
        {!locked && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title={t("common.edit")}
              className="size-9 px-0"
              aria-label={t("txn.editAria")}
            >
              <IconPencil size={16} />
            </Button>
            <Button
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title={t("common.delete")}
              className="size-9 px-0"
              aria-label={t("txn.deleteAria")}
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
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-11 place-items-center rounded-lg border border-line text-muted">
        <IconFlow size={20} />
      </span>
      <div>
        <p className="font-medium text-ink">{t("txn.emptyTitle")}</p>
        <p className="max-w-xs text-sm text-muted">{t("txn.emptyBody")}</p>
      </div>
      <Button onClick={onAdd}>
        <IconPlus size={16} /> {t("txn.addExpense")}
      </Button>
    </div>
  );
}
