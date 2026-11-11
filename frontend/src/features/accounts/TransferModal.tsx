import { ArrowRight } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FieldError, FieldHint, Label } from "../../components/ui/label";
import { Modal } from "../../components/ui/modal";
import { MoneyInput } from "../../components/ui/money-input";
import { Select } from "../../components/ui/select";
import { InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { formatMoney } from "../../lib/format";
import { todayIso } from "../../lib/dates";
import { useErrorText, useT } from "../../lib/i18n";
import type { Account } from "../../types";
import { useCreateTransfer } from "./hooks";
import { accountEmoji } from "./util";

type Errors = { to?: string; amount?: string; date?: string };

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
  const toast = useToast();
  const errText = useErrorText();
  const transfer = useCreateTransfer();
  const ids = { from: useId(), to: useId(), amount: useId(), date: useId() };
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFrom(accounts[0]?.id ?? "");
    setTo(accounts[1]?.id ?? "");
    setAmount("");
    setDate(todayIso());
    setErrors({});
    setServerError(null);
  }, [open, accounts]);

  // From and To must differ: validate as soon as either changes once an error is showing.
  function pickFrom(id: string) {
    setFrom(id);
    if (errors.to) setErrors((e) => ({ ...e, to: id === to ? t("transfer.sameAccount") : undefined }));
  }
  function pickTo(id: string) {
    setTo(id);
    if (errors.to) setErrors((e) => ({ ...e, to: id === from ? t("transfer.sameAccount") : undefined }));
  }

  async function submit() {
    if (transfer.isPending) return;
    const next: Errors = {};
    if (!from || !to || from === to) next.to = t("transfer.sameAccount");
    if (!amount || Number(amount) <= 0) next.amount = t("transfer.amountError");
    if (!date) next.date = t("transfer.dateError");
    setErrors(next);
    setServerError(null);
    const first = (["to", "amount", "date"] as const).find((k) => next[k]);
    if (first) {
      document.getElementById(ids[first])?.focus();
      return;
    }
    const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";
    try {
      await transfer.mutateAsync({ from_account_id: from, to_account_id: to, amount, occurred_on: date });
      toast(t("transfer.toast", { amount: formatMoney(amount), from: nameOf(from), to: nameOf(to) }));
      onClose();
    } catch (err) {
      setServerError(errText(err));
    }
  }

  const options = accounts.map((a) => (
    <option key={a.id} value={a.id}>
      {accountEmoji(a)} {a.name}
    </option>
  ));

  return (
    <Modal open={open} onClose={onClose} title={t("transfer.title")} align="start">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div>
            <Label htmlFor={ids.from} required>
              {t("transfer.from")}
            </Label>
            <Select id={ids.from} value={from} onChange={(e) => pickFrom(e.target.value)}>
              {options}
            </Select>
          </div>
          <ArrowRight size={16} aria-hidden="true" className="mt-9 hidden justify-self-center text-muted sm:block" />
          <div>
            <Label htmlFor={ids.to} required>
              {t("transfer.to")}
            </Label>
            <Select
              id={ids.to}
              value={to}
              onChange={(e) => pickTo(e.target.value)}
              aria-invalid={errors.to ? true : undefined}
              aria-describedby={errors.to ? `${ids.to}-error` : undefined}
            >
              {options}
            </Select>
            <FieldError id={`${ids.to}-error`} message={errors.to} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={ids.amount} required>
              {t("transfer.amount")}
            </Label>
            <MoneyInput
              id={ids.amount}
              autoFocus
              value={amount}
              onValueChange={setAmount}
              placeholder="0"
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? `${ids.amount}-error` : undefined}
            />
            <FieldError id={`${ids.amount}-error`} message={errors.amount} />
          </div>
          <div>
            <Label htmlFor={ids.date} required>
              {t("transfer.date")}
            </Label>
            <Input
              id={ids.date}
              type="date"
              className="nums"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? `${ids.date}-error` : undefined}
            />
            <FieldError id={`${ids.date}-error`} message={errors.date} />
          </div>
        </div>

        <FieldHint>{t("transfer.hint")}</FieldHint>
        {serverError && <InlineAlert tone="error">{serverError}</InlineAlert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={transfer.isPending}>
            {t("transfer.title")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
