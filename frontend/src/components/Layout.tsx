import { Menu, Settings, WalletCards, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import type { TKey } from "../lib/i18n/en";
import { Button } from "./ui/button";
import { LanguageToggle } from "./ui/language-toggle";
import { Modal } from "./ui/modal";
import { IconDashboard, IconFlow, IconLogout, IconSpendMark, IconTag } from "./icons";

const links: { to: string; label: TKey; icon: typeof IconDashboard }[] = [
  { to: "/", label: "nav.overview", icon: IconDashboard },
  { to: "/transactions", label: "nav.transactions", icon: IconFlow },
  { to: "/budgets", label: "nav.budgets", icon: WalletCards },
  { to: "/categories", label: "nav.categories", icon: IconTag },
  { to: "/settings", label: "nav.settings", icon: Settings },
];

export function Layout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const t = useT();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-canvas text-charcoal">
      <a href="#main-content" className="skip-link">
        {t("nav.skipToContent")}
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-[1480px] items-center gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand text-white">
              <IconSpendMark size={22} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="display text-2xl text-ink">ViSpend</p>
              {(user?.username ?? user?.email) && (
                <p className="nums truncate text-xs text-muted">{user?.username ?? user?.email}</p>
              )}
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="ml-auto hidden min-w-0 items-center gap-2 md:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  [
                    "inline-flex h-12 shrink-0 items-center gap-2.5 rounded-lg px-4 text-base font-medium transition-colors duration-150",
                    isActive ? "bg-brand text-white" : "text-muted hover:bg-black/[0.04] hover:text-ink",
                  ].join(" ")
                }
              >
                <Icon size={20} />
                <span>{t(label)}</span>
              </NavLink>
            ))}
            <span className="mx-2 h-7 w-px shrink-0 bg-line" />
            <LanguageToggle />
            <Button
              variant="ghost"
              onClick={() => setConfirmLogout(true)}
              title={t("nav.signOut")}
              aria-label={t("nav.signOut")}
              className="h-12 px-4"
            >
              <IconLogout size={20} />
            </Button>
          </nav>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={menuOpen}
            className="ml-auto size-11 px-0 md:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <nav className="border-t border-line bg-canvas px-3 py-2 md:hidden">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                    isActive ? "bg-brand text-white" : "text-charcoal hover:bg-black/[0.04]",
                  ].join(" ")
                }
              >
                <Icon size={20} />
                <span>{t(label)}</span>
              </NavLink>
            ))}
            <div className="flex items-center justify-between gap-3 px-3 py-3">
              <span className="text-base font-medium text-charcoal">{t("language.label")}</span>
              <LanguageToggle />
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmLogout(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-charcoal transition-colors hover:bg-black/[0.04]"
            >
              <IconLogout size={20} />
              <span>{t("nav.signOut")}</span>
            </button>
          </nav>
        )}
      </header>
      <main id="main-content" className="mx-auto max-w-[1480px] px-4 py-7 sm:py-10 lg:px-6">
        {children}
      </main>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title={t("logout.title")}>
        <p className="text-sm text-muted">{t("logout.confirm")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmLogout(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmLogout(false);
              logout();
            }}
          >
            {t("logout.action")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
