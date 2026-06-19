import { useState } from "react";

import { CategoryIcon, IconCheck, IconPencil, IconPlus, IconTrash, IconX } from "../../components/icons";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ColorSwatchPicker, DEFAULT_CATEGORY_COLOR } from "../../components/ui/color-swatch-picker";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { useCategoryLabel, useErrorText, useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import type { Category, TxnType } from "../../types";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "./hooks";

const ICON_KEYS = [
  "tag", "food", "coffee", "cart", "bus", "car", "plane", "bed",
  "bill", "phone", "wifi", "bolt", "droplet", "home", "key", "book",
  "heart", "pill", "dumbbell", "paw", "shirt", "sparkles", "film", "gamepad",
  "wrench", "repeat", "gift", "users", "circle",
  "wallet", "cash", "coins", "chart", "piggy",
];

export function CategoriesPage() {
  const { data: cats = [] } = useCategories();
  const create = useCreateCategory();
  const t = useT();
  const errText = useErrorText();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<TxnType>("expense");
  const [icon, setIcon] = useState("tag");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);

  function add() {
    if (!name.trim()) return;
    setError(null);
    create.mutate(
      { name: name.trim(), type, icon, color },
      {
        onSuccess: () => setName(""),
        onError: (e) => setError(errText(e, "cat.createError")),
      },
    );
  }

  const expense = cats.filter((c) => c.type === "expense");
  const income = cats.filter((c) => c.type === "income");

  return (
    <div className="space-y-6">
      <header className="max-w-2xl space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{t("cat.system")}</p>
        <h1 className="display text-3xl text-ink sm:text-4xl">{t("cat.title")}</h1>
        <p className="text-sm text-muted">{t("cat.subtitle")}</p>
      </header>

      <Card className="rise space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_auto] lg:items-end">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {t("cat.newCategory")}
            </label>
            <Input
              placeholder={t("cat.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value as TxnType)}>
            <option value="expense">{t("type.expense")}</option>
            <option value="income">{t("type.income")}</option>
          </Select>
          <Button onClick={add} disabled={create.isPending}>
            <IconPlus size={16} /> {t("common.add")}
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{t("cat.icon")}</span>
            <div className="flex flex-wrap gap-1.5">
              {ICON_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={`Icon ${k}`}
                  onClick={() => setIcon(k)}
                  className={cn(
                    "grid size-9 place-items-center rounded-md border transition-colors",
                    icon === k ? "border-brand bg-brand-soft text-brand-dark" : "border-line text-muted hover:text-ink",
                  )}
                >
                  <CategoryIcon name={k} size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{t("cat.color")}</span>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-pastel-red-ink/20 bg-pastel-red px-3 py-2 text-xs text-pastel-red-ink">
            {error}
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("cat.expenseCategories")} items={expense} onError={setError} />
        <Section title={t("cat.incomeCategories")} items={income} onError={setError} />
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  onError,
}: {
  title: string;
  items: Category[];
  onError: (m: string) => void;
}) {
  const t = useT();
  return (
    <Card className="rise overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-medium text-ink">{title}</h2>
        <p className="mt-1 text-xs text-muted">{t("cat.savedLabels", { count: items.length })}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">{t("cat.none")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((c) => (
            <CategoryRow key={c.id} category={c} onError={onError} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function CategoryRow({
  category: c,
  onError,
}: {
  category: Category;
  onError: (m: string) => void;
}) {
  const update = useUpdateCategory();
  const del = useDeleteCategory();
  const t = useT();
  const errText = useErrorText();
  const categoryLabel = useCategoryLabel();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(c.name);

  function saveName() {
    if (!editName.trim()) return;
    update.mutate(
      { id: c.id, name: editName.trim() },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => onError(errText(e, "cat.renameError")),
      },
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-md"
        style={{ backgroundColor: (c.color ?? "#cbd5d1") + "22", color: c.color ?? "#5b6770" }}
      >
        <CategoryIcon name={c.icon} size={16} />
      </span>

      {editing ? (
        <Input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-9 min-w-[180px] flex-1"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{categoryLabel(c)}</span>
      )}

      <div className="flex items-center gap-1.5">
        {editing ? (
          <>
            <Button onClick={saveName} className="size-9 px-0" aria-label={t("cat.saveAria")}>
              <IconCheck size={16} />
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} className="size-9 px-0" aria-label={t("cat.cancelAria")}>
              <IconX size={16} />
            </Button>
          </>
        ) : c.is_default ? (
          <Badge tone="neutral">{t("cat.default")}</Badge>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditName(c.name);
                setEditing(true);
              }}
              className="size-9 px-0"
              aria-label={t("common.rename")}
            >
              <IconPencil size={16} />
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                del.mutate(c.id, {
                  onError: (e) => onError(errText(e, "cat.deleteError")),
                })
              }
              className="size-9 px-0"
              aria-label={t("common.delete")}
            >
              <IconTrash size={16} />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
