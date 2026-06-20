import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../components/ui/button";
import { CategoryCombobox } from "../../components/ui/category-combobox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { DEFAULT_CATEGORY_COLOR } from "../../components/ui/color-swatch-picker";
import { useCategories, useCreateCategory } from "../categories/hooks";
import { useCategoryLabel, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import type { ParseSuggestion, Transaction, TxnType } from "../../types";
import { useCreateTransaction, useUpdateTransaction, useUploadReceipt } from "./hooks";

const schema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.string().refine((v) => Number(v) > 0, "txnModal.amountError"),
  category_id: z.string().uuid("txnModal.categoryError"),
  occurred_on: z.string().min(1),
  method: z.enum(["cash", "transfer", "card"]),
  note: z.string().optional(),
});
type Form = z.infer<typeof schema>;
const today = () => new Date().toISOString().slice(0, 10);

export function TransactionModal({
  open,
  onClose,
  editing,
  defaultType = "expense",
  prefill,
  pendingImage,
  ocrText,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
  defaultType?: TxnType;
  prefill?: ParseSuggestion;
  pendingImage?: Blob | null;
  ocrText?: string;
}) {
  const { data: cats = [] } = useCategories();
  const createCat = useCreateCategory();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const uploadReceipt = useUploadReceipt();
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const isEdit = Boolean(editing);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, method: "cash", occurred_on: today() },
  });

  const type = watch("type");
  const categoryId = watch("category_id");
  const options = cats
    .filter((c) => c.type === type)
    .map((c) => ({ id: c.id, name: categoryLabel(c) }));

  // (Re)initialise the form whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        type: editing.type,
        amount: editing.amount,
        category_id: editing.category_id,
        occurred_on: editing.occurred_on,
        method: editing.method,
        note: editing.note ?? "",
      });
    } else if (prefill) {
      reset({
        type: prefill.type,
        amount: prefill.amount ?? "",
        category_id: prefill.category_id ?? "",
        occurred_on: prefill.occurred_on,
        method: prefill.method ?? "cash",
        note: prefill.note ?? "",
      });
    } else {
      reset({ type: defaultType, method: "cash", occurred_on: today(), note: "" });
    }
  }, [open, editing, defaultType, prefill, reset]);

  // Keep a category valid for the selected type.
  useEffect(() => {
    if (options.length && !options.some((c) => c.id === categoryId)) {
      setValue("category_id", options[0].id, { shouldValidate: true });
    }
  }, [type, options, categoryId, setValue]);

  async function createCategory(name: string) {
    const created = await createCat.mutateAsync({ name, type, color: DEFAULT_CATEGORY_COLOR });
    return { id: created.id };
  }

  function submit(data: Form) {
    if (isEdit && editing) {
      update.mutate({ id: editing.id, body: data }, { onSuccess: onClose });
    } else {
      create.mutate({ ...data, ocr_text: ocrText }, {
        onSuccess: async (created: Transaction) => {
          if (pendingImage) {
            try {
              await uploadReceipt.mutateAsync({ id: created.id, file: pendingImage });
            } catch {
              alert(t("scan.uploadFailed"));
            }
          }
          onClose();
        },
      });
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("txnModal.editTitle") : t("txnModal.newTitle")}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("txnModal.type")}</Label>
            <Select {...register("type")}>
              <option value="expense">{t("type.expense")}</option>
              <option value="income">{t("type.income")}</option>
            </Select>
          </div>
          <div>
            <Label>{t("txnModal.amount")}</Label>
            <Input type="number" inputMode="decimal" placeholder="0" className="nums" {...register("amount")} />
            {errors.amount && <p className="mt-1 text-xs text-expense">{t(errors.amount.message as TKey)}</p>}
          </div>
        </div>

        <div>
          <Label>{t("txnModal.category")}</Label>
          <CategoryCombobox
            options={options}
            value={categoryId ?? ""}
            onChange={(id) => setValue("category_id", id, { shouldValidate: true })}
            onCreate={createCategory}
          />
          {errors.category_id && (
            <p className="mt-1 text-xs text-expense">{t(errors.category_id.message as TKey)}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("txnModal.date")}</Label>
            <Input type="date" className="nums" {...register("occurred_on")} />
          </div>
          <div>
            <Label>{t("txnModal.method")}</Label>
            <Select {...register("method")}>
              <option value="cash">{t("method.cash")}</option>
              <option value="transfer">{t("method.transfer")}</option>
              <option value="card">{t("method.card")}</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>{t("txnModal.note")}</Label>
          <Input placeholder={t("txnModal.notePlaceholder")} {...register("note")} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={pending}>
            {pending ? t("common.saving") : isEdit ? t("txnModal.update") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
