import { useEffect, useState } from "react";

import { cn } from "../../lib/utils";
import { useT } from "../../lib/i18n";
import { IconChevronDown, IconPlus } from "../icons";

interface Option {
  id: string;
  name: string;
}

export function CategoryCombobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder,
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<{ id: string } | undefined>;
  placeholder?: string;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const selectedName = options.find((o) => o.id === value)?.name ?? "";

  // Reflect the externally selected category in the input when closed.
  useEffect(() => {
    if (!open) setQuery(selectedName);
  }, [selectedName, open]);

  const q = query.trim().toLowerCase();
  const selectedQuery = selectedName.trim().toLowerCase();
  const shouldShowAll = open && (!q || q === selectedQuery);
  const filtered = shouldShowAll ? options : options.filter((o) => o.name.toLowerCase().includes(q));
  const exact = options.some((o) => o.name.toLowerCase() === q);
  const canCreate = Boolean(q) && !exact;

  function select(id: string, name: string) {
    onChange(id);
    setQuery(name);
    setOpen(false);
  }

  async function create() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      if (created) select(created.id, name);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <input
        value={query}
        placeholder={placeholder ?? t("combobox.placeholder")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="h-11 w-full rounded-md border border-line bg-surface pl-3 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
      <IconChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line bg-surface py-1 shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                select(o.id, o.name);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-black/[0.04]",
                o.id === value ? "font-medium text-ink" : "text-charcoal",
              )}
            >
              {o.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                void create();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-dark hover:bg-brand-soft"
            >
              <IconPlus size={15} />
              {t("combobox.create", { name: query.trim() })}
            </button>
          )}
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-sm text-muted">{t("combobox.noMatch")}</p>
          )}
        </div>
      )}
    </div>
  );
}
