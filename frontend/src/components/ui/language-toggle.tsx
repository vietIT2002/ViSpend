import { useLanguage, useT } from "../../lib/i18n";
import type { Lang } from "../../lib/i18n";
import { cn } from "../../lib/utils";

const OPTIONS: { lang: Lang; short: string; name: "language.en" | "language.vi" }[] = [
  { lang: "en", short: "EN", name: "language.en" },
  { lang: "vi", short: "VI", name: "language.vi" },
];

/** Compact EN/VI switch; applies at once and is saved to the profile. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const t = useT();
  return (
    <div
      className={cn("inline-flex items-center gap-0.5 rounded border border-line-strong bg-surface p-0.5", className)}
      role="group"
      aria-label={t("language.label")}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          lang={o.lang}
          onClick={() => setLang(o.lang)}
          aria-pressed={lang === o.lang}
          aria-label={t(o.name)}
          title={t(o.name)}
          className={cn(
            "h-7 rounded-sm px-2.5 text-xs font-semibold transition-colors",
            lang === o.lang ? "bg-brand-soft text-brand" : "text-charcoal hover:bg-black/[0.04]",
          )}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
