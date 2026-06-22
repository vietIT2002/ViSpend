import { Archive, ArchiveRestore, ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useErrorText, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { cn, vnd } from "../../lib/utils";
import type { Account } from "../../types";
import { AccountModal } from "./AccountModal";
import { TransferModal } from "./TransferModal";
import { useAccounts, useDeleteAccount, useUpdateAccount } from "./hooks";
import { accountEmoji } from "./util";

function AccountCard({ acc, onEdit }: { acc: Account; onEdit: (a: Account) => void }) {
  const t = useT();
  const errText = useErrorText();
  const update = useUpdateAccount();
  const del = useDeleteAccount();
  const color = acc.color ?? "#5b6770";
  const balance = Number(acc.balance);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg text-lg"
          style={{ backgroundColor: color + "1f" }}
        >
          {accountEmoji(acc)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{acc.name}</p>
          <p className="text-xs text-muted">{t(`accounts.type.${acc.type}` as TKey)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <p className={cn("nums mr-1 text-right font-bold", balance < 0 ? "text-expense" : "text-ink")}>
          {balance < 0 ? `−${vnd(Math.abs(balance))}` : vnd(acc.balance)}
        </p>
        {acc.archived ? (
          <Button
            variant="secondary"
            className="size-8 px-0"
            aria-label={t("accounts.unarchive")}
            onClick={() => update.mutate({ id: acc.id, body: { archived: false } })}
          >
            <ArchiveRestore size={14} />
          </Button>
        ) : (
          <>
            <Button variant="secondary" className="size-8 px-0" aria-label={t("common.edit")} onClick={() => onEdit(acc)}>
              <Pencil size={14} />
            </Button>
            <Button
              variant="secondary"
              className="size-8 px-0"
              aria-label={t("accounts.archive")}
              onClick={() => update.mutate({ id: acc.id, body: { archived: true } })}
            >
              <Archive size={14} />
            </Button>
          </>
        )}
        <Button
          variant="danger"
          className="size-8 px-0"
          aria-label={t("accounts.deleteAria")}
          disabled={del.isPending}
          onClick={() => del.mutate(acc.id, { onError: (e) => alert(`${errText(e)}\n${t("accounts.inUseHint")}`) })}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

export function AccountsPage() {
  const t = useT();
  const { data, isLoading } = useAccounts(true); // include archived; split client-side
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const accounts = data?.accounts ?? [];
  const active = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);
  const archived = useMemo(() => accounts.filter((a) => a.archived), [accounts]);

  function openEdit(a: Account) {
    setEditing(a);
    setModalOpen(true);
  }
  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{t("accounts.heading")}</p>
          <h1 className="display text-3xl text-ink sm:text-4xl">{t("accounts.title")}</h1>
          <p className="text-sm text-muted">{t("accounts.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={active.length < 2} onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight size={15} /> {t("transfer.title")}
          </Button>
          <Button onClick={openAdd}>
            <Plus size={16} /> {t("accounts.addAccount")}
          </Button>
        </div>
      </header>

      {/* Total net worth */}
      <Card className="rise p-5">
        <p className="text-xs text-muted">{t("accounts.totalNetWorth")}</p>
        <p className="nums text-3xl font-bold tracking-tight text-ink">{vnd(data?.total_net_worth ?? 0)}</p>
        <p className="mt-1 text-xs text-muted">{t("accounts.netWorthHint")}</p>
      </Card>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted">{t("common.loading")}</p>
      ) : accounts.length === 0 ? (
        <Card className="rise p-10 text-center text-sm text-muted">{t("accounts.noAccounts")}</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((a) => (
            <AccountCard key={a.id} acc={a} onEdit={openEdit} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{t("accounts.archived")}</h2>
          <div className="grid gap-3 opacity-75 sm:grid-cols-2">
            {archived.map((a) => (
              <AccountCard key={a.id} acc={a} onEdit={openEdit} />
            ))}
          </div>
        </section>
      )}

      <AccountModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} accounts={active} />
    </div>
  );
}
