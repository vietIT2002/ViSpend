import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";
import { IconDashboard, IconFlow, IconLogout, IconSpendMark, IconTag } from "./icons";

const links = [
  { to: "/", label: "Overview", icon: IconDashboard },
  { to: "/transactions", label: "Transactions", icon: IconFlow },
  { to: "/categories", label: "Categories", icon: IconTag },
];

export function Layout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-canvas text-charcoal">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand text-white">
              <IconSpendMark size={22} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="display text-2xl text-ink">ViSpend</p>
              {user?.email && <p className="nums truncate text-xs text-muted">{user.email}</p>}
            </div>
          </div>

          <nav className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  [
                    "inline-flex h-12 shrink-0 items-center gap-2.5 rounded-lg px-4 text-base font-medium transition-colors duration-150",
                    isActive
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-black/[0.04] hover:text-ink",
                  ].join(" ")
                }
              >
                <Icon size={20} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
            <span className="mx-2 hidden h-7 w-px shrink-0 bg-line sm:block" />
            <Button
              variant="ghost"
              onClick={() => setConfirmLogout(true)}
              title="Sign out"
              aria-label="Sign out"
              className="h-12 px-4"
            >
              <IconLogout size={20} />
            </Button>
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-7 sm:py-10 lg:px-6">
        {children}
      </main>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Log out">
        <p className="text-sm text-muted">Are you sure you want to log out?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmLogout(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmLogout(false);
              logout();
            }}
          >
            Log out
          </Button>
        </div>
      </Modal>
    </div>
  );
}
