import { Lock, ScanLine, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { IconPencil, IconPlus, IconTrash } from "../../components/icons";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Modal } from "../../components/ui/modal";
import { PageHeader } from "../../components/ui/page-header";
import { Select } from "../../components/ui/select";
import { Skeleton, TableSkeletonRows } from "../../components/ui/skeleton";
import { EmptyState, ErrorState, InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { api } from "../../lib/api";
import { isIsoDate } from "../../lib/dates";
import { EMPTY, formatAmount, formatDate, formatDateTime, formatMoney, formatNumber } from "../../lib/format";
import { useCategoryLabel, useErrorText, useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { forcedState } from "../../lib/use-unsaved-changes";
import type { Account, ParseSuggestion, PayMethod, Transaction, TxnType } from "../../types";
import { AccountLogo } from "../accounts/AccountLogo";
import { useAccounts } from "../accounts/hooks";
import { useCategories } from "../categories/hooks";
import { TransactionModal } from "./TransactionModal";
import { useDeleteTransaction, useParseText, useTransactions, type TxnFilter } from "./hooks";

const PAGE_SIZES = [20, 50, 100];
const TYPES: TxnType[] = ["expense", "income"];
const METHODS: PayMethod[] = ["cash", "transfer", "card"];

// The API lets a transaction be edited or deleted within 24h of being recorded.
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const isLocked = (txn: Transaction) => Date.now() - new Date(txn.created_at).getTime() > EDIT_WINDOW_MS;

const oneOf = <T extends string>(value: string | null, allowed: T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

/** Signed amount without the symbol (the column header names VND). */
const signedAmount = (txn: Transaction) =>
  formatAmount(txn.type === "income" ? Number(txn.amount) : -Number(txn.amount), { signDisplay: "exceptZero" });

/** Signed amount with the currency, for places without a VND column header. */
const signedMoney = (txn: Transaction) =>
  formatMoney(txn.type === "income" ? Number(txn.amount) : -Number(txn.amount), { signDisplay: "exceptZero" });

const amountClass = (txn: Transaction) => (txn.type === "income" ? "text-brand" : "text-ink");

function NotSet() {
  const t = useT();
  return (
    <>
      <span aria-hidden="true" className="text-muted">
        {EMPTY}
      </span>
      <span className="sr-only">{t("common.notSet")}</span>
    </>
  );
}

export function TransactionsPage() {
  const t = useT();
  const toast = useToast();
  const categoryLabel = useCategoryLabel();
  const [params, setParams] = useSearchParams();
  const forced = forcedState(params);
  const ids = { type: useId(), category: useId(), method: useId(), account: useId(), from: useId(), to: useId(), size: useId() };

  // Filters, page and page size live in the URL so links and Back keep them.
  const filter: TxnFilter = {
    type: oneOf(params.get("type"), TYPES),
    category_id: params.get("category") || undefined,
    method: oneOf(params.get("method"), METHODS),
    account_id: params.get("account") || undefined,
    from: isIsoDate(params.get("from")) ? params.get("from")! : undefined,
    to: isIsoDate(params.get("to")) ? params.get("to")! : undefined,
  };
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = PAGE_SIZES.includes(Number(params.get("size"))) ? Number(params.get("size")) : PAGE_SIZES[0];
  const hasFilters = Object.values(filter).some(Boolean);

  function setParam(patch: Record<string, string | undefined>, keepPage = false) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (!keepPage) next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function clearFilters() {
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        const size = prev.get("size");
        if (size) next.set("size", size);
        return next;
      },
      { replace: true },
    );
  }

  const query = useTransactions({ ...filter, page, page_size: pageSize }, { keepPrevious: true });
  const { data: cats = [] } = useCategories();
  const { data: activeAccounts } = useAccounts();
  const { data: allAccounts } = useAccounts(true);
  const accountList = activeAccounts?.accounts ?? [];
  const accountById = (id: string | null | undefined) =>
    id ? (allAccounts?.accounts ?? accountList).find((a) => a.id === id) : undefined;
  const del = useDeleteTransaction();
  const parseText = useParseText();

  const catName = (id: string) => {
    const c = cats.find((cat) => cat.id === id);
    return c ? categoryLabel(c) : t("txn.unknown");
  };
  const recordName = (txn: Transaction) =>
    t("txn.recordName", { type: t(`type.${txn.type}`), amount: formatMoney(txn.amount), category: catName(txn.category_id) });

  const items = forced === "empty" ? [] : (query.data?.items ?? []);
  const total = forced === "empty" ? 0 : (query.data?.total ?? 0);
  const loading = forced === "loading" || (!forced && query.isLoading);
  const failed = forced === "error" || (!forced && query.isError && !query.data);
  const refreshing = !forced && query.isPlaceholderData;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filterCats = cats.filter((c) => !filter.type || c.type === filter.type);

  // Keep the page in range if the result set shrinks (e.g. after deleting).
  useEffect(() => {
    if (query.data && page > totalPages) setParam({ page: totalPages > 1 ? String(totalPages) : undefined }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, page, totalPages]);

  // ---- create / edit dialog
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [newType, setNewType] = useState<TxnType>("expense");
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [receiptWarning, setReceiptWarning] = useState(false);

  function openAdd(type: TxnType) {
    setEditing(null);
    setNewType(type);
    setModalOpen(true);
  }

  function openEdit(txn: Transaction) {
    setEditing(txn);
    setModalOpen(true);
  }

  // ---- scan a receipt
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState(false);
  const [prefill, setPrefill] = useState<ParseSuggestion | null>(null);
  const [pendingImage, setPendingImage] = useState<Blob | null>(null);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{
    date: string;
    amount: string;
    resolve: (proceed: boolean) => void;
  } | null>(null);

  function clearScan() {
    setPrefill(null);
    setPendingImage(null);
    setPendingHash(null);
    setOcrText(null);
  }

  async function onScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    setScanProgress(0);
    setScanError(false);
    try {
      const { compressImage, recognizeImage, sha256Hex } = await import("./ocr");
      // Warn early if this exact image was already saved as a transaction.
      const hash = await sha256Hex(file);
      const dup = await api.get<{ duplicate: boolean; occurred_on?: string; amount?: string }>(
        `/transactions/receipt-duplicate?hash=${hash}`,
      );
      if (dup.duplicate) {
        const proceed = await new Promise<boolean>((resolve) =>
          setDuplicate({
            date: dup.occurred_on ? formatDate(dup.occurred_on) : EMPTY,
            amount: formatMoney(dup.amount ?? 0),
            resolve,
          }),
        );
        if (!proceed) return;
      }
      // OCR on the original (preprocessing happens inside); compress only for upload.
      const [text, compressed] = await Promise.all([recognizeImage(file, setScanProgress), compressImage(file)]);
      const suggestion = await parseText.mutateAsync(text);
      setOcrText(text);
      setPrefill(suggestion);
      setPendingImage(compressed);
      setPendingHash(hash);
      setEditing(null);
      setNewType(suggestion.type);
      setModalOpen(true);
    } catch {
      clearScan();
      setScanError(true);
    } finally {
      setScanning(false);
    }
  }

  // ---- filter chips
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filter.type)
    chips.push({ key: "type", label: `${t("txn.colType")}: ${t(`type.${filter.type}`)}`, onRemove: () => setParam({ type: undefined, category: undefined }) });
  if (filter.category_id)
    chips.push({ key: "category", label: `${t("txn.colCategory")}: ${catName(filter.category_id)}`, onRemove: () => setParam({ category: undefined }) });
  if (filter.method)
    chips.push({ key: "method", label: `${t("txn.colMethod")}: ${t(`method.${filter.method}`)}`, onRemove: () => setParam({ method: undefined }) });
  if (filter.account_id)
    chips.push({ key: "account", label: `${t("txn.colAccount")}: ${accountById(filter.account_id)?.name ?? t("txn.unknown")}`, onRemove: () => setParam({ account: undefined }) });
  if (filter.from)
    chips.push({ key: "from", label: `${t("period.from")}: ${formatDate(filter.from)}`, onRemove: () => setParam({ from: undefined }) });
  if (filter.to)
    chips.push({ key: "to", label: `${t("period.to")}: ${formatDate(filter.to)}`, onRemove: () => setParam({ to: undefined }) });

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("txn.title")}
        actions={
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onScanFile} />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={scanning}
              title={t("scan.hint")}
              aria-describedby="scan-hint"
            >
              {!scanning && <ScanLine size={16} aria-hidden="true" />}
              {scanning ? t("scan.readingPercent", { percent: Math.round(scanProgress * 100) }) : t("scan.button")}
            </Button>
            <span id="scan-hint" className="sr-only">
              {t("scan.hint")}
            </span>
            <Button variant="secondary" onClick={() => openAdd("income")}>
              <IconPlus size={16} aria-hidden="true" /> {t("txn.addIncome")}
            </Button>
            <Button onClick={() => openAdd("expense")}>
              <IconPlus size={16} aria-hidden="true" /> {t("txn.addExpense")}
            </Button>
          </>
        }
      />

      <span role="status" className="sr-only">
        {scanning ? t("scan.reading") : ""}
      </span>

      {scanError && (
        <InlineAlert
          tone="error"
          onDismiss={() => setScanError(false)}
          action={
            <Button variant="secondary" className="h-8 sm:h-8" onClick={() => openAdd("expense")}>
              {t("scan.enterManually")}
            </Button>
          }
        >
          {t("scan.failed")}
        </InlineAlert>
      )}
      {receiptWarning && (
        <InlineAlert tone="warning" onDismiss={() => setReceiptWarning(false)}>
          {t("scan.uploadFailed")}
        </InlineAlert>
      )}

      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[150px_200px_190px_200px_170px_170px]">
          <div>
            <Label htmlFor={ids.type}>{t("txn.colType")}</Label>
            <Select
              id={ids.type}
              value={filter.type ?? ""}
              onChange={(e) => setParam({ type: e.target.value || undefined, category: undefined })}
            >
              <option value="">{t("txn.allTypes")}</option>
              <option value="expense">{t("type.expense")}</option>
              <option value="income">{t("type.income")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor={ids.category}>{t("txn.colCategory")}</Label>
            <Select
              id={ids.category}
              value={filter.category_id ?? ""}
              onChange={(e) => setParam({ category: e.target.value || undefined })}
            >
              <option value="">{t("txn.allCategories")}</option>
              {filterCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={ids.method}>{t("txn.colMethod")}</Label>
            <Select
              id={ids.method}
              value={filter.method ?? ""}
              onChange={(e) => setParam({ method: e.target.value || undefined })}
            >
              <option value="">{t("txn.allMethods")}</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`method.${m}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={ids.account}>{t("txn.colAccount")}</Label>
            <Select
              id={ids.account}
              value={filter.account_id ?? ""}
              onChange={(e) => setParam({ account: e.target.value || undefined })}
            >
              <option value="">{t("txn.allAccounts")}</option>
              {accountList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              {filter.account_id && !accountList.some((a) => a.id === filter.account_id) && (
                <option value={filter.account_id}>{accountById(filter.account_id)?.name ?? t("txn.unknown")}</option>
              )}
            </Select>
          </div>
          <div>
            <Label htmlFor={ids.from}>{t("period.from")}</Label>
            <Input
              id={ids.from}
              type="date"
              className="nums"
              value={filter.from ?? ""}
              max={filter.to}
              onChange={(e) => setParam({ from: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label htmlFor={ids.to}>{t("period.to")}</Label>
            <Input
              id={ids.to}
              type="date"
              className="nums"
              value={filter.to ?? ""}
              min={filter.from}
              onChange={(e) => setParam({ to: e.target.value || undefined })}
            />
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap items-center gap-2" aria-label={t("filters.applied")}>
            {chips.map((chip) => (
              <li key={chip.key}>
                <span className="inline-flex h-7 items-center gap-1 rounded-full border border-line-strong bg-surface pl-2.5 pr-1 text-sm text-ink">
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={t("filters.remove", { filter: chip.label })}
                    className="grid size-6 place-items-center rounded-full text-muted hover:bg-black/[0.06] hover:text-ink"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={clearFilters}
                className="h-7 rounded px-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                {t("filters.clearAll")}
              </button>
            </li>
          </ul>
        )}
      </Card>

      {/* Results */}
      <Card className="overflow-hidden">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2">
          <p role="status" className="nums text-sm text-muted">
            {loading || failed
              ? ""
              : t(total === 1 ? "txn.countOne" : "txn.countOther", { count: formatNumber(total) })}
          </p>
          {query.isError && query.data && !forced && (
            <p role="alert" className="flex items-center gap-2 text-sm text-expense">
              {t("txn.refreshError")}
              <Button variant="secondary" className="h-8 sm:h-8" onClick={() => void query.refetch()}>
                {t("common.retry")}
              </Button>
            </p>
          )}
        </div>

        {failed ? (
          <ErrorState
            message={t("txn.loadError")}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : !loading && items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title={t("txn.noResultsTitle")}
              body={t("txn.noResultsBody")}
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  {t("filters.clearAll")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t("txn.emptyTitle")}
              body={t("txn.emptyBody")}
              action={
                <Button onClick={() => openAdd("expense")}>
                  <IconPlus size={16} aria-hidden="true" /> {t("txn.addExpense")}
                </Button>
              }
            />
          )
        ) : (
          <div aria-busy={loading || refreshing} className={cn(refreshing && "opacity-60 transition-opacity")}>
            {/* Phones: one block per transaction */}
            <ul className="divide-y divide-line md:hidden">
              {loading
                ? [0, 1, 2, 3, 4].map((i) => (
                    <li key={i} className="space-y-2 px-4 py-3" aria-hidden="true">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </li>
                  ))
                : items.map((txn) => (
                    <TransactionMobileRow
                      key={txn.id}
                      txn={txn}
                      category={catName(txn.category_id)}
                      record={recordName(txn)}
                      onView={() => setViewing(txn)}
                      onEdit={() => openEdit(txn)}
                      onDelete={() => setDeleting(txn)}
                    />
                  ))}
            </ul>

            {/* Tablets and up: the table */}
            <div className="hidden relative overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-canvas text-left">
                  <tr className="h-10">
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colDate")}</th>
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colType")}</th>
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colCategory")}</th>
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colAccount")}</th>
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colNote")}</th>
                    <th scope="col" className="px-3 font-medium text-muted">{t("txn.colMethod")}</th>
                    <th scope="col" className="px-3 text-right font-medium text-muted">{t("txn.colAmountVnd")}</th>
                    <th scope="col" className="w-28 px-3 text-right font-medium text-muted">
                      <span className="sr-only">{t("txn.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loading ? (
                    <TableSkeletonRows columns={8} />
                  ) : (
                    items.map((txn) => (
                      <tr
                        key={txn.id}
                        className="h-10 cursor-pointer whitespace-nowrap transition-colors hover:bg-black/[0.02]"
                        onClick={() => setViewing(txn)}
                      >
                        <td className="nums px-3 text-charcoal">
                          <time dateTime={txn.occurred_on}>{formatDate(txn.occurred_on)}</time>
                        </td>
                        <td className="px-3 text-charcoal">{t(`type.${txn.type}`)}</td>
                        <td className="px-3">
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewing(txn);
                            }}
                            className="block max-w-56 truncate rounded text-left font-medium text-ink hover:underline"
                          >
                            {catName(txn.category_id)}
                          </button>
                        </td>
                        <td className="px-3 text-charcoal">
                          <AccountCell account={accountById(txn.account_id)} />
                        </td>
                        <td className="px-3 text-charcoal">
                          {txn.note?.trim() ? (
                            <span className="block max-w-72 truncate" title={txn.note}>
                              {txn.note}
                            </span>
                          ) : (
                            <NotSet />
                          )}
                        </td>
                        <td className="px-3 text-charcoal">{t(`method.${txn.method}`)}</td>
                        <td className={cn("nums px-3 text-right font-medium", amountClass(txn))}>{signedAmount(txn)}</td>
                        <td className="px-3 py-1 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowActions
                            txn={txn}
                            record={recordName(txn)}
                            onEdit={() => openEdit(txn)}
                            onDelete={() => setDeleting(txn)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!failed && !loading && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor={ids.size} className="text-sm text-muted">
                {t("pagination.rowsPerPage")}
              </label>
              <div className="w-20">
                <Select
                  id={ids.size}
                  className="h-8 sm:h-8"
                  value={pageSize}
                  onChange={(e) => setParam({ size: e.target.value === String(PAGE_SIZES[0]) ? undefined : e.target.value })}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <span className="nums text-sm text-muted">
              {t("txn.rangeOf", {
                start: formatNumber(rangeStart),
                end: formatNumber(rangeEnd),
                total: formatNumber(total),
              })}
            </span>
            <nav aria-label={t("pagination.label")} className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="h-8 sm:h-8"
                disabled={page <= 1}
                onClick={() => setParam({ page: page - 1 > 1 ? String(page - 1) : undefined }, true)}
              >
                {t("common.prev")}
              </Button>
              <span className="nums text-sm text-muted">{t("txn.pageOf", { page, pages: totalPages })}</span>
              <Button
                variant="secondary"
                className="h-8 sm:h-8"
                disabled={page >= totalPages}
                onClick={() => setParam({ page: String(page + 1) }, true)}
              >
                {t("common.next")}
              </Button>
            </nav>
          </div>
        )}
      </Card>

      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          clearScan();
        }}
        editing={editing}
        defaultType={newType}
        prefill={prefill ?? undefined}
        pendingImage={pendingImage}
        pendingHash={pendingHash ?? undefined}
        ocrText={ocrText ?? undefined}
        onReceiptUploadFailed={() => setReceiptWarning(true)}
      />

      <TransactionDetails
        txn={viewing}
        category={viewing ? catName(viewing.category_id) : ""}
        onClose={() => setViewing(null)}
        onEdit={(txn) => {
          setViewing(null);
          openEdit(txn);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("txn.deleteTitle")}
        confirmLabel={t("txn.deleteConfirm")}
        onConfirm={async () => {
          if (!deleting) return;
          const record = recordName(deleting);
          await del.mutateAsync(deleting.id);
          toast(t("txn.toastDeleted", { record }));
        }}
        onClose={() => setDeleting(null)}
      >
        {deleting && (
          <>
            <p className="font-medium text-ink">
              {recordName(deleting)} · {formatDate(deleting.occurred_on)}
            </p>
            <p>{t("txn.deleteBody")}</p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(duplicate)}
        title={t("scan.duplicateTitle")}
        confirmLabel={t("scan.duplicateConfirm")}
        tone="default"
        onConfirm={() => duplicate?.resolve(true)}
        onClose={() => {
          duplicate?.resolve(false);
          setDuplicate(null);
        }}
      >
        {duplicate && <p>{t("scan.duplicate", { date: duplicate.date, amount: duplicate.amount })}</p>}
      </ConfirmDialog>
    </div>
  );
}

function AccountCell({ account }: { account?: Account }) {
  if (!account) return <NotSet />;
  return (
    <span className="flex max-w-48 items-center gap-2">
      <AccountLogo acc={account} size={20} />
      <span className="truncate">{account.name}</span>
    </span>
  );
}

function LockedNote({ txn }: { txn: Transaction }) {
  const t = useT();
  const hint = t("txn.lockedHint", { date: formatDateTime(txn.created_at) });
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" title={hint}>
      <Lock size={14} aria-hidden="true" />
      {t("txn.locked")}
      <span className="sr-only">. {hint}</span>
    </span>
  );
}

function RowActions({
  txn,
  record,
  onEdit,
  onDelete,
}: {
  txn: Transaction;
  record: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  if (isLocked(txn)) return <LockedNote txn={txn} />;
  return (
    <div className="inline-flex justify-end gap-1">
      <Button
        variant="ghost"
        onClick={onEdit}
        title={t("common.edit")}
        aria-label={t("txn.editAria", { record })}
        className="size-8 px-0 sm:size-8"
      >
        <IconPencil size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="danger"
        onClick={onDelete}
        title={t("common.delete")}
        aria-label={t("txn.deleteAria", { record })}
        className="size-8 px-0 sm:size-8"
      >
        <IconTrash size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}

function TransactionMobileRow({
  txn,
  category,
  record,
  onView,
  onEdit,
  onDelete,
}: {
  txn: Transaction;
  category: string;
  record: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <li className="flex items-start gap-2 px-4 py-3">
      <button type="button" aria-haspopup="dialog" onClick={onView} className="min-w-0 flex-1 rounded text-left">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate font-medium text-ink">{category}</span>
          <span className={cn("nums shrink-0 font-medium", amountClass(txn))}>{signedMoney(txn)}</span>
        </span>
        <span className="nums mt-0.5 block text-sm text-muted">
          {formatDate(txn.occurred_on)} · {t(`type.${txn.type}`)} · {t(`method.${txn.method}`)}
        </span>
        {txn.note?.trim() && <span className="mt-0.5 block truncate text-sm text-charcoal">{txn.note}</span>}
      </button>
      <div className="shrink-0 pt-0.5">
        <RowActions txn={txn} record={record} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

function TransactionDetails({
  txn,
  category,
  onClose,
  onEdit,
}: {
  txn: Transaction | null;
  category: string;
  onClose: () => void;
  onEdit: (txn: Transaction) => void;
}) {
  const t = useT();
  const errText = useErrorText();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  // Drop the previous receipt when another transaction opens or the dialog closes.
  useEffect(() => {
    setReceiptError(null);
    setReceiptUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, [txn?.id]);

  async function loadReceipt(id: string) {
    setReceiptLoading(true);
    setReceiptError(null);
    try {
      const blob = await api.getBlob(`/transactions/${id}/receipt`);
      setReceiptUrl(URL.createObjectURL(blob));
    } catch (err) {
      setReceiptError(errText(err, "errors.receipt_unavailable"));
    } finally {
      setReceiptLoading(false);
    }
  }

  const locked = txn ? isLocked(txn) : false;

  return (
    <Modal open={Boolean(txn)} onClose={onClose} title={t("txn.details")}>
      {txn && (
        <div>
          <dl>
            <DetailRow label={t("txn.detailAmount")}>
              <span className={cn("nums font-semibold", amountClass(txn))}>
                {signedMoney(txn)}
              </span>
            </DetailRow>
            <DetailRow label={t("txn.detailType")}>{t(`type.${txn.type}`)}</DetailRow>
            <DetailRow label={t("txn.detailCategory")}>{category}</DetailRow>
            <DetailRow label={t("txn.detailDate")}>
              <time className="nums" dateTime={txn.occurred_on}>
                {formatDate(txn.occurred_on)}
              </time>
            </DetailRow>
            <DetailRow label={t("txn.detailMethod")}>{t(`method.${txn.method}`)}</DetailRow>
            <DetailRow label={t("txn.detailNote")}>{txn.note?.trim() ? txn.note : <NotSet />}</DetailRow>
            <DetailRow label={t("txn.detailRecorded")}>
              <time className="nums" dateTime={txn.created_at}>
                {formatDateTime(txn.created_at)}
              </time>
            </DetailRow>
          </dl>

          {locked && (
            <InlineAlert tone="info" className="mt-3">
              {t("txn.lockedHint", { date: formatDateTime(txn.created_at) })}
            </InlineAlert>
          )}

          {receiptUrl && (
            <figure className="mt-3 space-y-2">
              <img
                src={receiptUrl}
                alt={t("scan.receiptAlt", { category, date: formatDate(txn.occurred_on) })}
                className="max-h-80 w-full rounded-md border border-line object-contain"
              />
              <figcaption>
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-sm font-medium text-brand underline-offset-4 hover:underline"
                >
                  {t("scan.openReceipt")}
                </a>
              </figcaption>
            </figure>
          )}
          {receiptError && (
            <InlineAlert tone="error" className="mt-3">
              {receiptError}
            </InlineAlert>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            {txn.has_receipt && !receiptUrl && (
              <Button variant="secondary" loading={receiptLoading} onClick={() => void loadReceipt(txn.id)}>
                {t("scan.viewReceipt")}
              </Button>
            )}
            {locked ? (
              <Button variant="secondary" onClick={onClose}>
                {t("common.close")}
              </Button>
            ) : (
              <Button onClick={() => onEdit(txn)}>
                <IconPencil size={16} aria-hidden="true" /> {t("txn.editTransaction")}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
