import { useEffect, useId, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FieldError, FieldHint, Label } from "../../components/ui/label";
import { Modal } from "../../components/ui/modal";
import { MoneyInput } from "../../components/ui/money-input";
import { Select } from "../../components/ui/select";
import { InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { toWholeAmount } from "../../lib/format";
import { ColorSwatchPicker, DEFAULT_CATEGORY_COLOR } from "../../components/ui/color-swatch-picker";
import { useErrorText, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import type { Account, AccountType } from "../../types";
import { AccountLogo } from "./AccountLogo";
import { BANK_BRANDS, EWALLET_BRANDS } from "./banks";
import { useCreateAccount, useUpdateAccount } from "./hooks";
import { ACCOUNT_TYPES, TYPE_EMOJI } from "./util";

const EWALLET_CODES = new Set(EWALLET_BRANDS.map((b) => b.code));

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
  const toast = useToast();
  const errText = useErrorText();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const isEdit = Boolean(editing);
  const ids = { brand: useId(), name: useId(), type: useId(), opening: useId(), icon: useId(), color: useId() };

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [opening, setOpening] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [brand, setBrand] = useState<string>("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setNameError(undefined);
    setServerError(null);
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setOpening(toWholeAmount(editing.opening_balance));
      setIcon(editing.icon ?? "");
      setColor(editing.color ?? DEFAULT_CATEGORY_COLOR);
      setBrand(editing.brand ?? "");
    } else {
      setName("");
      setType("bank");
      setOpening("");
      setIcon("");
      setColor(DEFAULT_CATEGORY_COLOR);
      setBrand("");
    }
  }, [open, editing]);

  // Picking a brand fills the logo, suggests the name (if blank) and the type.
  function onBrandChange(code: string) {
    setBrand(code);
    if (!code) return;
    const found = [...BANK_BRANDS, ...EWALLET_BRANDS].find((b) => b.code === code);
    if (found && !name.trim()) {
      setName(found.name);
      setNameError(undefined);
    }
    setType(EWALLET_CODES.has(code) ? "ewallet" : "bank");
  }

  async function submit() {
    if (pending) return;
    const trimmed = name.trim();
    setServerError(null);
    if (!trimmed) {
      setNameError(t("accounts.nameError"));
      document.getElementById(ids.name)?.focus();
      return;
    }
    setNameError(undefined);
    const body = {
      name: trimmed,
      type,
      opening_balance: opening || "0",
      brand: brand || null,
      icon: icon.trim() || null,
      color,
    };
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, body });
        toast(t("accounts.toastUpdated", { name: trimmed }));
      } else {
        await create.mutateAsync(body);
        toast(t("accounts.toastCreated", { name: trimmed }));
      }
      onClose();
    } catch (err) {
      setServerError(errText(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t(isEdit ? "accounts.editTitle" : "accounts.newTitle")} align="start">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <Label htmlFor={ids.brand}>{t("accounts.brand")}</Label>
          <div className="flex items-center gap-3">
            <AccountLogo acc={{ brand, icon, type, color }} size={44} />
            <Select id={ids.brand} className="flex-1" value={brand} onChange={(e) => onBrandChange(e.target.value)}>
              <option value="">{t("accounts.brandNone")}</option>
              <optgroup label={t("accounts.banks")}>
                {BANK_BRANDS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t("accounts.ewallets")}>
                {EWALLET_BRANDS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={ids.name} required>
              {t("accounts.name")}
            </Label>
            <Input
              id={ids.name}
              autoFocus
              value={name}
              placeholder="TPBank"
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? `${ids.name}-error` : undefined}
            />
            <FieldError id={`${ids.name}-error`} message={nameError} />
          </div>
          <div>
            <Label htmlFor={ids.type}>{t("accounts.type")}</Label>
            <Select id={ids.type} value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {TYPE_EMOJI[tp]} {t(`accounts.type.${tp}` as TKey)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor={ids.opening}>{t("accounts.openingBalance")}</Label>
          <MoneyInput
            id={ids.opening}
            value={opening}
            onValueChange={setOpening}
            placeholder="0"
            aria-describedby={`${ids.opening}-hint`}
          />
          <FieldHint id={`${ids.opening}-hint`}>{t("accounts.openingHint")}</FieldHint>
        </div>

        <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
          <div>
            <Label htmlFor={ids.icon}>{t("accounts.emoji")}</Label>
            <Input
              id={ids.icon}
              value={icon}
              maxLength={2}
              placeholder={TYPE_EMOJI[type]}
              className="text-center"
              onChange={(e) => setIcon(e.target.value)}
            />
          </div>
          <div>
            <Label id={ids.color}>{t("accounts.color")}</Label>
            <ColorSwatchPicker value={color} onChange={setColor} labelledBy={ids.color} />
          </div>
        </div>

        {serverError && <InlineAlert tone="error">{serverError}</InlineAlert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={pending}>
            {t(isEdit ? "common.saveChanges" : "accounts.addAccount")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
