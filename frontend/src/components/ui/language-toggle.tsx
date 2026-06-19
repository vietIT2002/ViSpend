import { cn } from "../../lib/utils";
import { useLanguage } from "../../lib/i18n";
import type { Lang } from "../../lib/i18n";

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "EN" },
  { lang: "vi", label: "VI" },
];

// Compact segmented EN/VI switch. `tone="dark"` suits light backgrounds (default);
// kept minimal so it fits both the top bar and the settings card.
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          onClick={() => setLang(o.lang)}
          aria-pressed={lang === o.lang}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-semibold leading-5 transition-colors",
            lang === o.lang
              ? "bg-brand text-white"
              : "text-muted hover:bg-black/[0.04] hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
