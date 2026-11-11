import { Archive, ArchiveRestore, ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { PageHeader } from "../../components/ui/page-header";
import { TableSkeletonRows } from "../../components/ui/skeleton";
import { EmptyState, ErrorState, InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { formatAmount, formatMoney, formatNumber } from "../../lib/format";
import { useErrorText, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { forcedState } from "../../lib/use-unsaved-changes";
import { cn } from "../../lib/utils";
import type { Account } from "../../types";
import { AccountLogo } from "./AccountLogo";
import { AccountModal } from "./AccountModal";
import { TransferModal } from "./TransferModal";
import { useAccounts, useDeleteAccount, useUpdateAccount } from "./hooks";

function AccountTable({
  titleId,
  rows,
  loading,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  titleId?: string;
  rows: Account[];
  loading?: boolean;
  onEdit: (a: Account) => void;
  onToggleArchive: (a: Account) => void;
  onDelete: (a: Account) => void;
}) {
  const t = useT();
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm" aria-labelledby={titleId} aria-busy={loading || undefined}>
        <thead className="border-b border-line bg-canvas text-left">
          <tr className="h-10">
            <th scope="col" className="px-3 font-medium text-muted">{t("accounts.colAccount")}</th>
            <th scope="col" className="hidden px-3 font-medium text-muted sm:table-cell">{t("accounts.colType")}</th>
            <th scope="col" className="px-3 text-right font-medium text-muted">{t("accounts.colBalanceVnd")}</th>
            <th scope="col" className="w-28 px-3 text-right font-medium text-muted">
              <span className="sr-only">{t("accounts.colActions")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading ? (
            <TableSkeletonRows columns={4} rows={4} />
          ) : (
            rows.map((acc) => {
              const balance = Number(acc.balance);
              const typeLabel = t(`accounts.type.${acc.type}` as TKey);
              return (
                <tr key={acc.id} className="h-10">
                  <td className="max-w-0 px-3 py-1 sm:max-w-none">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <AccountLogo acc={acc} size={28} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink" title={acc.name}>
                          {acc.name}
                        </p>
                        <p className="truncate text-xs leading-4 text-muted sm:hidden">{typeLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 text-charcoal sm:table-cell">{typeLabel}</td>
                  <td className={cn("nums px-3 text-right font-medium", balance < 0 ? "text-expense" : "text-ink")}>
                    {formatAmount(balance)}
                  </td>
                  <td className="px-3 py-1 text-right">
                    <div className="inline-flex justify-end gap-1">
                      {!acc.archived && (
                        <Button
                          variant="ghost"
                          className="size-8 px-0 sm:size-8"
                          title={t("common.edit")}
                          aria-label={t("accounts.editAria", { name: acc.name })}
                          onClick={() => onEdit(acc)}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="size-8 px-0 sm:size-8"
                        title={t(acc.archived ? "accounts.unarchive" : "accounts.archive")}
                        aria-label={t(acc.archived ? "accounts.restoreAria" : "accounts.archiveAria", { name: acc.name })}
                        onClick={() => onToggleArchive(acc)}
                      >
                        {acc.archived ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
                      </Button>
                      <Button
                        variant="danger"
                        className="size-8 px-0 sm:size-8"
                        title={t("common.delete")}
                        aria-label={t("accounts.deleteAria", { name: acc.name })}
                        onClick={() => onDelete(acc)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AccountsPage() {
  const t = useT();
  const toast = useToast();
  const errText = useErrorText();
  const [params] = useSearchParams();
  const forced = forcedState(params);
  const activeTitleId = useId();
  const archivedTitleId = useId();
  const query = useAccounts(true); // include archived; split client-side
  const update = useUpdateAccount();
  const del = useDeleteAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const accounts = useMemo(() => (forced === "empty" ? [] : (query.data?.accounts ?? [])), [forced, query.data]);
  const active = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);
  const archived = useMemo(() => accounts.filter((a) => a.archived), [accounts]);
  const loading = forced === "loading" || (!forced && query.isLoading);
  const failed = forced === "error" || (!forced && query.isError && !query.data);

  function openEdit(a: Account) {
    setEditing(a);
    setModalOpen(true);
  }
  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  async function toggleArchive(a: Account) {
    setActionError(null);
    try {
      await update.mutateAsync({ id: a.id, body: { archived: !a.archived } });
      toast(t(a.archived ? "accounts.toastRestored" : "accounts.toastArchived", { name: a.name }));
    } catch (err) {
      setActionError(errText(err));
    }
  }

  const tableProps = { onEdit: openEdit, onToggleArchive: (a: Account) => void toggleArchive(a), onDelete: setDeleting };
  const summary =
    !loading && !failed && accounts.length > 0 ? (
      <span className="nums">
        {t("accounts.totalNetWorth")}{" "}
        <strong className="font-medium text-ink">{formatMoney(query.data?.total_net_worth ?? 0)}</strong>
        {" · "}
        {t(active.length === 1 ? "accounts.countOne" : "accounts.countOther", { count: formatNumber(active.length) })}
      </span>
    ) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("accounts.title")}
        meta={summary}
        actions={
          <>
            <Button variant="secondary" disabled={active.length < 2} onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight size={16} aria-hidden="true" /> {t("transfer.title")}
            </Button>
            <Button onClick={openAdd}>
              <Plus size={16} aria-hidden="true" /> {t("accounts.addAccount")}
            </Button>
          </>
        }
      />

      {actionError && (
        <InlineAlert tone="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </InlineAlert>
      )}

      <Card className="overflow-hidden">
        <h2 id={activeTitleId} className="sr-only">
          {t("accounts.title")}
        </h2>
        {failed ? (
          <ErrorState message={t("accounts.loadError")} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        ) : !loading && accounts.length === 0 ? (
          <EmptyState
            title={t("accounts.emptyTitle")}
            body={t("accounts.emptyBody")}
            action={
              <Button onClick={openAdd}>
                <Plus size={16} aria-hidden="true" /> {t("accounts.addAccount")}
              </Button>
            }
          />
        ) : (
          <AccountTable titleId={activeTitleId} rows={active} loading={loading} {...tableProps} />
        )}
      </Card>

      {!loading && !failed && archived.length > 0 && (
        <section className="space-y-2">
          <h2 id={archivedTitleId} className="text-base font-semibold leading-6 text-ink">
            {t("accounts.archived")}
          </h2>
          <Card className="overflow-hidden">
            <AccountTable titleId={archivedTitleId} rows={archived} {...tableProps} />
          </Card>
        </section>
      )}

      <AccountModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} accounts={active} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("accounts.deleteTitle", { name: deleting?.name ?? "" })}
        confirmLabel={t("accounts.deleteConfirm")}
        onConfirm={async () => {
          if (!deleting) return;
          const name = deleting.name;
          await del.mutateAsync(deleting.id);
          toast(t("accounts.toastDeleted", { name }));
        }}
        onClose={() => setDeleting(null)}
      >
        <p>{t("accounts.deleteBody")}</p>
      </ConfirmDialog>
    </div>
  );
}
