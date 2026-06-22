import { useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { ColorSwatchPicker, DEFAULT_CATEGORY_COLOR } from "../../components/ui/color-swatch-picker";
import { useErrorText, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import type { Account, AccountType } from "../../types";
import { useCreateAccount, useUpdateAccount } from "./hooks";
import { ACCOUNT_TYPES, TYPE_EMOJI } from "./util";

const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted";

export function AccountModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Account | null;
}) {
  const t = useT();
  const errText = useErrorText();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const isEdit = Boolean(editing);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [opening, setOpening] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setOpening(editing.opening_balance);
      setIcon(editing.icon ?? "");
      setColor(editing.color ?? DEFAULT_CATEGORY_COLOR);
    } else {
      setName("");
      setType("bank");
      setOpening("");
      setIcon("");
      setColor(DEFAULT_CATEGORY_COLOR);
    }
  }, [open, editing]);

  function submit() {
    if (!name.trim() || Number(opening || 0) < 0) return;
    const body = {
      name: name.trim(),
      type,
      opening_balance: opening.trim() || "0",
      icon: icon.trim() || null,
      color,
    };
    if (isEdit && editing) {
      update.mutate({ id: editing.id, body }, { onSuccess: onClose });
    } else {
      create.mutate(body, { onSuccess: onClose });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t(isEdit ? "accounts.editTitle" : "accounts.newTitle")} align="start">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>{t("accounts.name")}</label>
            <Input autoFocus value={name} placeholder="TPBank" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>{t("accounts.type")}</label>
            <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {TYPE_EMOJI[tp]} {t(`accounts.type.${tp}` as TKey)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className={LABEL}>{t("accounts.openingBalance")}</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₫</span>
            <Input
              type="number"
              inputMode="numeric"
              className="nums h-12 pl-8 text-lg"
              placeholder="0"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">{t("accounts.openingHint")}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
          <div>
            <label className={LABEL}>{t("accounts.emoji")}</label>
            <Input
              value={icon}
              maxLength={2}
              placeholder={TYPE_EMOJI[type]}
              className="text-center text-lg"
              onChange={(e) => setIcon(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>{t("accounts.color")}</label>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>
        </div>

        {error && <p className="text-xs text-expense">{errText(error)}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {t(isEdit ? "common.saveChanges" : "accounts.addAccount")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
