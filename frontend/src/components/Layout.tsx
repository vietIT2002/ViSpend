import { Menu, Settings, Wallet, WalletCards, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import type { TKey } from "../lib/i18n/en";
import { cn } from "../lib/utils";
import { IconDashboard, IconFlow, IconLogout, IconSpendMark, IconTag } from "./icons";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { LanguageToggle } from "./ui/language-toggle";

const links: { to: string; label: TKey; icon: typeof IconDashboard }[] = [
  { to: "/", label: "nav.overview", icon: IconDashboard },
  { to: "/transactions", label: "nav.transactions", icon: IconFlow },
  { to: "/budgets", label: "nav.budgets", icon: WalletCards },
  { to: "/accounts", label: "nav.accounts", icon: Wallet },
  { to: "/categories", label: "nav.categories", icon: IconTag },
  { to: "/settings", label: "nav.settings", icon: Settings },
];

// Five short first-level items fit a top bar. The active item gets a subtle
// fill and bold text (aria-current is set by NavLink); the accent stays on actions.
const itemClass = (isActive: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-2 rounded px-3 text-sm transition-colors",
    isActive ? "bg-black/[0.06] font-semibold text-ink" : "text-charcoal hover:bg-black/[0.04] hover:text-ink",
  );

export function Layout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const t = useT();
  const location = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const account = user?.username ?? user?.email;

  // Close the mobile menu on navigation and on Esc.
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-[100dvh] bg-canvas text-charcoal">
      <a href="#main-content" className="skip-link">
        {t("nav.skipToContent")}
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 lg:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 rounded" aria-label="ViSpend">
            <span className="grid size-8 place-items-center rounded-md bg-brand-bright text-white" aria-hidden="true">
              <IconSpendMark size={18} />
            </span>
            <span className="text-base font-semibold text-ink">ViSpend</span>
          </NavLink>

          <nav aria-label={t("nav.main")} className="hidden min-w-0 items-center gap-1 md:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => itemClass(isActive)}>
                <Icon size={16} aria-hidden="true" />
                <span>{t(label)}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <LanguageToggle />
            {account && (
              <span className="nums max-w-40 truncate text-sm text-muted" title={account}>
                {account}
              </span>
            )}
            <Button
              variant="ghost"
              onClick={() => setConfirmLogout(true)}
              title={t("nav.signOut")}
              aria-label={t("nav.signOut")}
              className="size-9 px-0"
            >
              <IconLogout size={18} aria-hidden="true" />
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="ml-auto size-10 px-0 md:hidden"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </Button>
        </div>

        {menuOpen && (
          <nav id="mobile-menu" aria-label={t("nav.main")} className="border-t border-line bg-surface px-3 py-2 md:hidden">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) => cn(itemClass(isActive), "flex h-11 w-full")}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{t(label)}</span>
              </NavLink>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-line px-3 py-3">
              <span className="text-sm font-medium text-ink">{t("language.label")}</span>
              <LanguageToggle />
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmLogout(true);
              }}
              className="flex h-11 w-full items-center gap-2 rounded px-3 text-left text-sm text-charcoal transition-colors hover:bg-black/[0.04]"
            >
              <IconLogout size={18} aria-hidden="true" />
              <span>{t("nav.signOut")}</span>
              {account && <span className="nums ml-auto truncate text-muted">{account}</span>}
            </button>
          </nav>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-4 py-6 outline-none lg:px-6">
        {children}
      </main>

      <ConfirmDialog
        open={confirmLogout}
        title={t("logout.title")}
        confirmLabel={t("logout.action")}
        tone="default"
        onConfirm={() => logout()}
        onClose={() => setConfirmLogout(false)}
      >
        <p>{t("logout.confirm")}</p>
      </ConfirmDialog>
    </div>
  );
}
