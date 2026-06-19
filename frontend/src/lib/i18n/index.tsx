import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import type { Category } from "../../types";
import { en, type TKey } from "./en";
import { vi } from "./vi";

export type Lang = "en" | "vi";

const LANG_KEY = "vispend_lang";
const DICTS: Record<Lang, Record<string, string>> = { en, vi };

function isLang(value: unknown): value is Lang {
  return value === "en" || value === "vi";
}

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
  /** Intl locale for date/number formatting. */
  locale: "en-US" | "vi-VN";
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return isLang(stored) ? stored : "en";
  });

  // Adopt the server-stored preference once the authenticated user loads.
  useEffect(() => {
    if (isLang(user?.language) && user.language !== lang) {
      setLangState(user.language);
      localStorage.setItem(LANG_KEY, user.language);
    }
    // Only react to the server value changing, not local edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language]);

  // Keep the document language attribute in sync for accessibility.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      localStorage.setItem(LANG_KEY, next);
      if (user) {
        // Persist to the profile; ignore failures (local choice still applies).
        void api
          .patch("/auth/me", { language: next })
          .then(() => refreshUser())
          .catch(() => undefined);
      }
    },
    [user, refreshUser],
  );

  const t = useCallback(
    (key: TKey, vars?: Vars) => {
      const dict = DICTS[lang];
      const template = dict[key] ?? en[key] ?? key;
      return interpolate(template, vars);
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t, locale: lang === "vi" ? "vi-VN" : "en-US" }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within LanguageProvider");
  return value;
}

export function useT() {
  return useI18n().t;
}

export function useLanguage() {
  const { lang, setLang } = useI18n();
  return { lang, setLang };
}

export function useLocale() {
  return useI18n().locale;
}

/** Maps an ApiError (whose message is a backend code) to localized text. */
export function useErrorText() {
  const { t } = useI18n();
  return useCallback(
    (err: unknown, fallback?: TKey): string => {
      if (err instanceof ApiError) {
        const key = `errors.${err.message}` as TKey;
        const text = t(key);
        if (text !== key) return text; // known code
      }
      return t(fallback ?? "errors.unknown");
    },
    [t],
  );
}

/** Localized label for a category: default categories use their key, custom keep their name. */
export function useCategoryLabel() {
  const { t } = useI18n();
  return useCallback(
    (category: Pick<Category, "name" | "key">): string => {
      if (category.key) {
        const key = `categories.${category.key}` as TKey;
        const text = t(key);
        if (text !== key) return text;
      }
      return category.name;
    },
    [t],
  );
}
