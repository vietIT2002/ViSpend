import { Lock } from "lucide-react";
import { useId, useRef, useState } from "react";

import { CategoryIcon, IconCheck, IconPencil, IconPlus, IconTrash, IconX } from "../../components/icons";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { ColorSwatchPicker, DEFAULT_CATEGORY_COLOR } from "../../components/ui/color-swatch-picker";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { FieldError, Label } from "../../components/ui/label";
import { PageHeader } from "../../components/ui/page-header";
import { Segmented } from "../../components/ui/segmented";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState, ErrorState, InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { formatNumber } from "../../lib/format";
import { useCategoryLabel, useErrorText, useLocale, useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import type { Category, TxnType } from "../../types";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "./hooks";

const ICON_KEYS = [
  "tag", "food", "coffee", "cart", "bus", "car", "plane", "bed",
  "bill", "phone", "wifi", "bolt", "droplet", "home", "key", "book",
  "heart", "pill", "dumbbell", "paw", "shirt", "sparkles", "film", "gamepad",
  "wrench", "repeat", "gift", "users", "circle",
  "wallet", "cash", "coins", "chart", "piggy",
];

export function CategoriesPage() {
  const t = useT();
  const toast = useToast();
  const locale = useLocale();
  const categoryLabel = useCategoryLabel();
  const query = useCategories();
  const del = useDeleteCategory();
  const [deleting, setDeleting] = useState<Category | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [newType, setNewType] = useState<TxnType>("expense");

  const sorted = [...(query.data ?? [])].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), locale));
  const expense = sorted.filter((c) => c.type === "expense");
  const income = sorted.filter((c) => c.type === "income");

  function startAdding(type: TxnType) {
    setNewType(type);
    nameRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("cat.title")} />

      <NewCategoryForm nameRef={nameRef} type={newType} onTypeChange={setNewType} />

      {query.isError && !query.data ? (
        <Card>
          <ErrorState message={t("cat.loadError")} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <CategoryList
            title={t("cat.expenseCategories")}
            items={expense}
            loading={query.isLoading}
            emptyBody={t("cat.noneExpense")}
            onAdd={() => startAdding("expense")}
            onDelete={setDeleting}
          />
          <CategoryList
            title={t("cat.incomeCategories")}
            items={income}
            loading={query.isLoading}
            emptyBody={t("cat.noneIncome")}
            onAdd={() => startAdding("income")}
            onDelete={setDeleting}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting ? t("cat.deleteTitle", { name: categoryLabel(deleting) }) : ""}
        confirmLabel={t("cat.deleteConfirm")}
        onConfirm={async () => {
          if (!deleting) return;
          const name = categoryLabel(deleting);
          await del.mutateAsync(deleting.id);
          toast(t("cat.toastDeleted", { name }));
        }}
        onClose={() => setDeleting(null)}
      >
        <p>{t("cat.deleteBody")}</p>
      </ConfirmDialog>
    </div>
  );
}

function NewCategoryForm({
  nameRef,
  type,
  onTypeChange,
}: {
  nameRef: React.RefObject<HTMLInputElement | null>;
  type: TxnType;
  onTypeChange: (type: TxnType) => void;
}) {
  const t = useT();
  const toast = useToast();
  const errText = useErrorText();
  const create = useCreateCategory();
  const nameId = useId();
  const iconLabelId = useId();
  const colorLabelId = useId();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  async function add() {
    const trimmed = name.trim();
    setServerError(null);
    if (!trimmed) {
      setNameError(t("cat.nameRequired"));
      nameRef.current?.focus();
      return;
    }
    setNameError(null);
    try {
      await create.mutateAsync({ name: trimmed, type, icon, color });
      toast(t("cat.toastCreated", { name: trimmed, type: t(`type.${type}`) }));
      setName("");
    } catch (err) {
      setServerError(errText(err, "cat.createError"));
    }
  }

  return (
    <Card>
      <CardHeader title={t("cat.newCategory")} description={t("cat.subtitle")} />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="space-y-4 p-4"
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,24rem)_auto] sm:items-start">
          <div>
            <Label htmlFor={nameId} required>
              {t("cat.name")}
            </Label>
            <Input
              id={nameId}
              ref={nameRef}
              placeholder={t("cat.namePlaceholder")}
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? `${nameId}-error` : undefined}
            />
            <FieldError id={`${nameId}-error`} message={nameError ?? undefined} />
          </div>
          <Segmented<TxnType>
            label={t("txnModal.type")}
            value={type}
            onChange={onTypeChange}
            options={[
              { value: "expense", label: t("type.expense") },
              { value: "income", label: t("type.income") },
            ]}
          />
        </div>

        <div>
          <span id={iconLabelId} className="mb-1.5 block text-sm font-medium text-ink">
            {t("cat.icon")}
          </span>
          <div role="radiogroup" aria-labelledby={iconLabelId} className="flex flex-wrap gap-1.5">
            {ICON_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={icon === k}
                aria-label={t("cat.iconOption", { name: k })}
                title={k}
                onClick={() => setIcon(k)}
                className={cn(
                  "grid size-9 place-items-center rounded border transition-colors",
                  icon === k ? "border-brand bg-brand-soft text-brand" : "border-line-strong text-charcoal hover:bg-black/[0.03]",
                )}
              >
                <CategoryIcon name={k} size={16} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span id={colorLabelId} className="mb-1.5 block text-sm font-medium text-ink">
            {t("cat.color")}
          </span>
          <ColorSwatchPicker value={color} onChange={setColor} labelledBy={colorLabelId} />
        </div>

        {serverError && <InlineAlert tone="error">{serverError}</InlineAlert>}

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={create.isPending}>
            {!create.isPending && <IconPlus size={16} aria-hidden="true" />}
            {t("cat.addCategory")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CategoryList({
  title,
  items,
  loading,
  emptyBody,
  onAdd,
  onDelete,
}: {
  title: string;
  items: Category[];
  loading: boolean;
  emptyBody: string;
  onAdd: () => void;
  onDelete: (category: Category) => void;
}) {
  const t = useT();
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        action={!loading && <span className="nums text-sm text-muted">{t("cat.count", { count: formatNumber(items.length) })}</span>}
      />
      {loading ? (
        <ul className="divide-y divide-line" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex h-12 items-center gap-3 px-4" aria-hidden="true">
              <Skeleton className="size-8" />
              <Skeleton className="h-4 w-40" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("cat.none")}
          body={emptyBody}
          action={
            <Button variant="secondary" onClick={onAdd}>
              <IconPlus size={16} aria-hidden="true" /> {t("cat.addCategory")}
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((c) => (
            <CategoryRow key={c.id} category={c} onDelete={() => onDelete(c)} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function CategoryRow({ category: c, onDelete }: { category: Category; onDelete: () => void }) {
  const t = useT();
  const toast = useToast();
  const errText = useErrorText();
  const categoryLabel = useCategoryLabel();
  const update = useUpdateCategory();
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(c.name);
  const [error, setError] = useState<string | null>(null);
  const label = categoryLabel(c);

  async function saveName() {
    const next = editName.trim();
    if (!next) return setError(t("cat.nameRequired"));
    if (next === c.name) {
      setEditing(false);
      return setError(null);
    }
    setError(null);
    try {
      await update.mutateAsync({ id: c.id, name: next });
      toast(t("cat.toastRenamed", { from: label, to: next }));
      setEditing(false);
    } catch (err) {
      setError(errText(err, "cat.renameError"));
    }
  }

  return (
    <li className="px-4 py-2">
      <div className="flex min-h-9 items-center gap-3">
        <span
          className="grid size-8 shrink-0 place-items-center rounded"
          style={{ backgroundColor: (c.color ?? "#9b9a95") + "22", color: c.color ?? "#5b6770" }}
          aria-hidden="true"
        >
          <CategoryIcon name={c.icon} size={16} />
        </span>

        {editing ? (
          <>
            <label htmlFor={inputId} className="sr-only">
              {t("cat.renameLabel", { name: label })}
            </label>
            <Input
              id={inputId}
              autoFocus
              value={editName}
              maxLength={60}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveName();
                if (e.key === "Escape") {
                  setEditing(false);
                  setError(null);
                }
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="h-9 min-w-0 flex-1 sm:h-9"
            />
            <Button
              onClick={() => void saveName()}
              loading={update.isPending}
              className="size-9 px-0 sm:size-9"
              aria-label={t("cat.saveAria", { name: label })}
            >
              {!update.isPending && <IconCheck size={16} aria-hidden="true" />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="size-9 px-0 sm:size-9"
              aria-label={t("cat.cancelAria")}
            >
              <IconX size={16} aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{label}</span>
            {c.is_default ? (
              <span className="inline-flex items-center gap-1.5" title={t("cat.defaultHint")}>
                <Badge tone="neutral">
                  <Lock size={12} aria-hidden="true" />
                  {t("cat.default")}
                </Badge>
                <span className="sr-only">{t("cat.defaultHint")}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditName(c.name);
                    setEditing(true);
                  }}
                  className="size-8 px-0 sm:size-8"
                  title={t("common.rename")}
                  aria-label={t("cat.renameAria", { name: label })}
                >
                  <IconPencil size={16} aria-hidden="true" />
                </Button>
                <Button
                  variant="danger"
                  onClick={onDelete}
                  className="size-8 px-0 sm:size-8"
                  title={t("common.delete")}
                  aria-label={t("cat.deleteAria", { name: label })}
                >
                  <IconTrash size={16} aria-hidden="true" />
                </Button>
              </span>
            )}
          </>
        )}
      </div>
      {editing && <FieldError id={`${inputId}-error`} message={error ?? undefined} />}
    </li>
  );
}
