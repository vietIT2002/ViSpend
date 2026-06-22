import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { useErrorText, useT } from "../../lib/i18n";
import type { Account } from "../../types";
import { useCreateTransfer } from "./hooks";
import { accountEmoji } from "./util";

const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TransferModal({
  open,
  onClose,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}) {
  const t = useT();
  const errText = useErrorText();
  const transfer = useCreateTransfer();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());

  useEffect(() => {
    if (!open) return;
    setFrom(accounts[0]?.id ?? "");
    setTo(accounts[1]?.id ?? "");
    setAmount("");
    setDate(today());
  }, [open, accounts]);

  const sameAccount = Boolean(from) && from === to;
  const canSubmit = Boolean(from) && Boolean(to) && !sameAccount && Number(amount) > 0 && !transfer.isPending;

  function submit() {
    if (!canSubmit) return;
    transfer.mutate(
      { from_account_id: from, to_account_id: to, amount, occurred_on: date },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={t("transfer.title")} align="start">
      <div className="space-y-4">
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div>
            <label className={LABEL}>{t("transfer.from")}</label>
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {accountEmoji(a)} {a.name}
                </option>
              ))}
            </Select>
          </div>
          <ArrowRight size={18} className="mb-2.5 hidden justify-self-center text-muted sm:block" />
          <div>
            <label className={LABEL}>{t("transfer.to")}</label>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {accountEmoji(a)} {a.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {sameAccount && <p className="text-xs text-expense">{t("transfer.sameAccount")}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("transfer.amount")}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₫</span>
              <Input
                type="number"
                inputMode="numeric"
                className="nums h-12 pl-8 text-lg"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>{t("transfer.date")}</label>
            <Input type="date" className="nums h-12" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-muted">{t("transfer.hint")}</p>
        {transfer.isError && <p className="text-xs text-expense">{errText(transfer.error)}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {t("transfer.title")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
