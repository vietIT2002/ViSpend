import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../components/ui/button";
import { CategoryCombobox } from "../../components/ui/category-combobox";
import { DEFAULT_CATEGORY_COLOR } from "../../components/ui/color-swatch-picker";
import { Input } from "../../components/ui/input";
import { FieldError, FieldHint, Label } from "../../components/ui/label";
import { Modal } from "../../components/ui/modal";
import { MoneyInput } from "../../components/ui/money-input";
import { Segmented } from "../../components/ui/segmented";
import { Select } from "../../components/ui/select";
import { InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { todayIso } from "../../lib/dates";
import { formatMoney, toWholeAmount } from "../../lib/format";
import { useCategoryLabel, useErrorText, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import type { ParseSuggestion, Transaction, TxnType } from "../../types";
import { useAccounts } from "../accounts/hooks";
import { accountEmoji } from "../accounts/util";
import { useCategories, useCreateCategory } from "../categories/hooks";
import { useCreateTransaction, useUpdateTransaction, useUploadReceipt } from "./hooks";

// zod messages are i18n keys, translated at render time.
const schema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.string().refine((v) => Number(v) > 0, "txnModal.amountError"),
  category_id: z.string().uuid("txnModal.categoryError"),
  occurred_on: z.string().min(1, "txnModal.dateError"),
  account_id: z.string().optional(),
  method: z.enum(["cash", "transfer", "card"]),
  note: z.string().max(500, "txnModal.noteTooLong").optional(),
});
type Form = z.infer<typeof schema>;

// Order of fields on screen; the first invalid one gets focus on submit.
const FIELD_ORDER = ["amount", "category_id", "occurred_on", "note"] as const;

export function TransactionModal({
  open,
  onClose,
  editing,
  defaultType = "expense",
  prefill,
  pendingImage,
  pendingHash,
  ocrText,
  onReceiptUploadFailed,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  defaultType?: TxnType;
  prefill?: ParseSuggestion;
  pendingImage?: Blob | null;
  pendingHash?: string;
  ocrText?: string;
  /** The transaction was saved but its image was not; the page shows a persistent warning. */
  onReceiptUploadFailed?: () => void;
}) {
  const { data: cats = [] } = useCategories();
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];
  const createCat = useCreateCategory();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const uploadReceipt = useUploadReceipt();
  const t = useT();
  const errText = useErrorText();
  const toast = useToast();
  const categoryLabel = useCategoryLabel();
  const isEdit = Boolean(editing);
  const ids = { amount: useId(), category_id: useId(), occurred_on: useId(), method: useId(), account_id: useId(), note: useId() };
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);

  // The discard question takes focus on its safe answer.
  useEffect(() => {
    if (confirmDiscard) keepEditingRef.current?.focus();
  }, [confirmDiscard]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    shouldFocusError: false,
    defaultValues: { type: defaultType, method: "cash", occurred_on: todayIso(), amount: "", note: "" },
  });

  const type = watch("type");
  const categoryId = watch("category_id");
  const amount = watch("amount");
  const accountId = watch("account_id");
  const options = cats.filter((c) => c.type === type).map((c) => ({ id: c.id, name: categoryLabel(c) }));

  // (Re)initialise the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setConfirmDiscard(false);
    if (editing) {
      reset({
        type: editing.type,
        amount: toWholeAmount(editing.amount),
        category_id: editing.category_id,
        occurred_on: editing.occurred_on,
        account_id: editing.account_id ?? "",
        method: editing.method,
        note: editing.note ?? "",
      });
    } else if (prefill) {
      reset({
        type: prefill.type,
        amount: toWholeAmount(prefill.amount),
        category_id: prefill.category_id ?? "",
        occurred_on: prefill.occurred_on,
        account_id: "",
        method: prefill.method ?? "cash",
        note: prefill.note ?? "",
      });
    } else {
      reset({ type: defaultType, amount: "", method: "cash", occurred_on: todayIso(), account_id: "", note: "" });
    }
  }, [open, editing, defaultType, prefill, reset]);

  // Default to the first account for new transactions once accounts have loaded.
  useEffect(() => {
    if (open && !isEdit && !accountId && accounts.length) {
      setValue("account_id", accounts[0].id);
    }
  }, [open, isEdit, accountId, accounts, setValue]);

  // Keep a category valid for the selected type.
  useEffect(() => {
    if (options.length && categoryId && !options.some((c) => c.id === categoryId)) {
      setValue("category_id", "", { shouldDirty: true });
    }
  }, [type, options, categoryId, setValue]);

  // A scanned receipt is unsaved work too, even before the user edits it.
  const hasUnsaved = isDirty || (Boolean(prefill) && !isEdit);
  const pending = isSubmitting || create.isPending || update.isPending || uploadReceipt.isPending;

  function requestClose() {
    if (pending) return;
    if (hasUnsaved) setConfirmDiscard(true);
    else onClose();
  }

  async function createCategory(name: string) {
    const created = await createCat.mutateAsync({ name, type, color: DEFAULT_CATEGORY_COLOR });
    return { id: created.id };
  }

  function recordName(data: Form) {
    const cat = cats.find((c) => c.id === data.category_id);
    return t("txn.recordName", {
      type: t(`type.${data.type}`),
      amount: formatMoney(data.amount),
      category: cat ? categoryLabel(cat) : t("txn.unknown"),
    });
  }

  async function submit(data: Form) {
    setServerError(null);
    const body = { ...data, account_id: data.account_id || null, note: data.note?.trim() ? data.note.trim() : null };
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ id: editing.id, body });
        toast(t("txn.toastUpdated", { record: recordName(data) }));
      } else {
        const created = await create.mutateAsync({ ...body, ocr_text: ocrText, receipt_hash: pendingHash });
        if (pendingImage) {
          try {
            await uploadReceipt.mutateAsync({ id: created.id, file: pendingImage });
          } catch {
            onReceiptUploadFailed?.();
          }
        }
        toast(t("txn.toastCreated", { record: recordName(data) }));
      }
      onClose();
    } catch (err) {
      // Keep everything the user typed; say what failed.
      setServerError(errText(err, "txnModal.saveError"));
    }
  }

  function onInvalid(errs: FieldErrors<Form>) {
    const first = FIELD_ORDER.find((name) => errs[name]);
    if (first) document.getElementById(ids[first])?.focus();
  }

  const errorText = (key?: string) => (key ? t(key as TKey) : undefined);
  const errorCount = FIELD_ORDER.filter((name) => errors[name]).length;

  return (
    <Modal open={open} onClose={requestClose} title={isEdit ? t("txnModal.editTitle") : t("txnModal.newTitle")}>
      <form onSubmit={handleSubmit(submit, onInvalid)} noValidate className="space-y-4">
        {prefill && !isEdit && <InlineAlert tone="info">{t("scan.reviewHint")}</InlineAlert>}

        {errorCount >= 3 && (
          <InlineAlert tone="error">
            <p className="font-medium">{t("form.errorSummary", { count: errorCount })}</p>
            <ul className="mt-1 list-disc pl-4">
              {FIELD_ORDER.filter((name) => errors[name]).map((name) => (
                <li key={name}>
                  <a
                    href={`#${ids[name]}`}
                    className="underline underline-offset-2"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(ids[name])?.focus();
                    }}
                  >
                    {errorText(errors[name]?.message)}
                  </a>
                </li>
              ))}
            </ul>
          </InlineAlert>
        )}

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Segmented<TxnType>
              label={t("txnModal.type")}
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "expense", label: t("type.expense") },
                { value: "income", label: t("type.income") },
              ]}
            />
          )}
        />

        <div>
          <Label htmlFor={ids.amount} required>
            {t("txnModal.amount")}
          </Label>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <MoneyInput
                id={ids.amount}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="0"
                aria-required="true"
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? `${ids.amount}-error` : `${ids.amount}-hint`}
                className="sm:max-w-60"
              />
            )}
          />
          {errors.amount ? (
            <FieldError id={`${ids.amount}-error`} message={errorText(errors.amount.message)} />
          ) : (
            <FieldHint id={`${ids.amount}-hint`}>
              {Number(amount) > 0 ? formatMoney(amount) : t("txnModal.amountHint")}
            </FieldHint>
          )}
        </div>

        <div>
          <Label htmlFor={ids.category_id} required>
            {t("txnModal.category")}
          </Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <CategoryCombobox
                id={ids.category_id}
                options={options}
                value={field.value ?? ""}
                onChange={(id) => setValue("category_id", id, { shouldValidate: true, shouldDirty: true })}
                onCreate={createCategory}
                required
                invalid={Boolean(errors.category_id)}
                describedBy={errors.category_id ? `${ids.category_id}-error` : undefined}
              />
            )}
          />
          <FieldError id={`${ids.category_id}-error`} message={errorText(errors.category_id?.message)} />
        </div>

        <div>
          <Label htmlFor={ids.account_id}>{t("txnModal.account")}</Label>
          <div className="sm:max-w-72">
            <Select id={ids.account_id} {...register("account_id")}>
              {accounts.length === 0 ? (
                <option value="">{t("txnModal.noAccount")}</option>
              ) : (
                accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountEmoji(a)} {a.name}
                  </option>
                ))
              )}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor={ids.occurred_on} required>
            {t("txnModal.date")}
          </Label>
          <Input
            id={ids.occurred_on}
            type="date"
            className="nums sm:max-w-48"
            aria-required="true"
            aria-invalid={errors.occurred_on ? true : undefined}
            aria-describedby={errors.occurred_on ? `${ids.occurred_on}-error` : undefined}
            {...register("occurred_on")}
          />
          <FieldError id={`${ids.occurred_on}-error`} message={errorText(errors.occurred_on?.message)} />
        </div>

        <div>
          <Label htmlFor={ids.method}>{t("txnModal.method")}</Label>
          <div className="sm:max-w-48">
            <Select id={ids.method} {...register("method")}>
              <option value="cash">{t("method.cash")}</option>
              <option value="transfer">{t("method.transfer")}</option>
              <option value="card">{t("method.card")}</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor={ids.note}>{t("txnModal.note")}</Label>
          <Input
            id={ids.note}
            placeholder={t("txnModal.notePlaceholder")}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? `${ids.note}-error` : undefined}
            {...register("note")}
          />
          <FieldError id={`${ids.note}-error`} message={errorText(errors.note?.message)} />
        </div>

        {serverError && <InlineAlert tone="error">{serverError}</InlineAlert>}

        {confirmDiscard ? (
          <div className="space-y-3 border-t border-line pt-4">
            <InlineAlert tone="warning">{t("unsaved.discardBody")}</InlineAlert>
            <div className="flex flex-wrap justify-end gap-2">
              <Button ref={keepEditingRef} type="button" variant="secondary" onClick={() => setConfirmDiscard(false)}>
                {t("unsaved.keepEditing")}
              </Button>
              <Button type="button" variant="destructive" onClick={onClose}>
                {t("unsaved.discard")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            {hasUnsaved && <span className="mr-auto text-sm text-muted">{t("unsaved.indicator")}</span>}
            <Button type="button" variant="secondary" onClick={requestClose} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? t("txnModal.update") : t("common.save")}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
