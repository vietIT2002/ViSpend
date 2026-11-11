import { useEffect, useId, useState, type KeyboardEvent } from "react";

import { useT } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { IconChevronDown, IconPlus } from "../icons";
import { controlClass } from "./input";

interface Option {
  id: string;
  name: string;
}

/**
 * Search-or-create picker (ARIA combobox with a listbox): type to filter,
 * ↑/↓ to move, Enter to pick or create, Esc to close.
 */
export function CategoryCombobox({
  id,
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  invalid,
  describedBy,
  required,
}: {
  id?: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<{ id: string } | undefined>;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
}) {
  const t = useT();
  const listId = useId();
  const optionId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const selectedName = options.find((o) => o.id === value)?.name ?? "";

  // Reflect the externally selected category in the input when closed.
  useEffect(() => {
    if (!open) setQuery(selectedName);
  }, [selectedName, open]);

  const q = query.trim().toLowerCase();
  const showAll = !q || q === selectedName.trim().toLowerCase();
  const filtered = showAll ? options : options.filter((o) => o.name.toLowerCase().includes(q));
  const canCreate = Boolean(q) && !options.some((o) => o.name.toLowerCase() === q);
  const count = filtered.length + (canCreate ? 1 : 0);

  function openList() {
    setOpen(true);
    const index = filtered.findIndex((o) => o.id === value);
    setActive(index >= 0 ? index : 0);
  }

  function select(option: Option) {
    onChange(option.id);
    setQuery(option.name);
    setOpen(false);
  }

  async function create() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      if (created) select({ id: created.id, name });
    } finally {
      setCreating(false);
    }
  }

  function pick(index: number) {
    if (index < filtered.length) select(filtered[index]);
    else if (canCreate) void create();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      if (count === 0) return;
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + count) % count);
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (count > 0) pick(Math.min(active, count - 1));
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  const activeId = open && count > 0 ? `${optionId}-${Math.min(active, count - 1)}` : undefined;

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder ?? t("combobox.placeholder")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={openList}
        onClick={() => !open && openList()}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={cn(controlClass, "pr-9")}
      />
      <IconChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />

      <ul
        id={listId}
        role="listbox"
        hidden={!open}
        className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      >
        {filtered.map((o, i) => (
          <li
            key={o.id}
            id={`${optionId}-${i}`}
            role="option"
            aria-selected={o.id === value}
            onMouseDown={(e) => {
              e.preventDefault();
              select(o);
            }}
            onMouseEnter={() => setActive(i)}
            className={cn(
              "flex cursor-pointer items-center px-3 py-2 text-sm",
              i === active ? "bg-black/[0.05]" : "",
              o.id === value ? "font-semibold text-ink" : "text-charcoal",
            )}
          >
            {o.name}
          </li>
        ))}
        {canCreate && (
          <li
            id={`${optionId}-${filtered.length}`}
            role="option"
            aria-selected={false}
            onMouseDown={(e) => {
              e.preventDefault();
              void create();
            }}
            onMouseEnter={() => setActive(filtered.length)}
            className={cn(
              "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-brand",
              active === filtered.length ? "bg-brand-soft" : "",
            )}
          >
            <IconPlus size={15} aria-hidden="true" />
            {creating ? t("common.saving") : t("combobox.create", { name: query.trim() })}
          </li>
        )}
        {count === 0 && (
          <li role="presentation" className="px-3 py-2 text-sm text-muted">
            {t("combobox.noMatch")}
          </li>
        )}
      </ul>
    </div>
  );
}
