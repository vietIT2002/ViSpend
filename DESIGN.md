---
version: alpha
name: "ViSpend"
description: "Personal income and expense tracker with receipt scanning, category budgets and cash-flow overview, bilingual EN/VI."
colors:
  primary: "#217a4b"
  on-primary: "#ffffff"
  primary-hover: "#1a6440"
  primary-subtle: "#e8f3ec"
  brand-mark: "#3cb371"
  background: "#fbfbfa"
  surface: "#ffffff"
  text: "#1a1a18"
  text-body: "#2f3437"
  text-muted: "#65645f"
  border: "#eaeaea"
  border-strong: "#d6d5d0"
  input-border: "#8f8e89"
  success: "#346538"
  warning: "#855900"
  danger: "#9f2f2d"
  info: "#1f6c9f"
typography:
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, 'Segoe UI', Roboto, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  caption:
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  section-title:
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
  page-title:
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
  kpi-value:
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    fontFeature: "tnum"
rounded:
  control: 4px
  card: 6px
  dialog: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    height: 36px (40px below 640px)
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.input-border}"
    rounded: "{rounded.control}"
    height: 36px (40px below 640px)
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.card}"
    shadow: none
  table-row:
    height: 40px
---

## Overview

- **Product:** ViSpend records a person's income and expenses, groups them by category, tracks monthly category budgets and shows cash flow over a chosen period. Receipts and transfer screenshots are read in the browser (OCR) and pre-fill the form; nothing is saved without review.
- **Users and roles:** one role, the account owner. There are no shared workspaces, approvers or admin screens.
- **Tasks:** record a transaction quickly (typed or scanned) · find and correct a recent transaction · see which budgets are near or over their limit · understand where the money went this month.
- **Volume:** tens to a few hundred transactions a month; 10–30 categories; one budget plan per month.

Design intent: familiar, dense, calm. Every screen helps the owner find a record, change it safely and see what needs attention.

## Colors

Neutral surfaces with one green accent (`primary`, white text 5.3:1) for primary buttons, links, focus and selection. `brand-mark` (#3cb371) is for the logo square and nothing that carries text. Secondary text uses `text-muted` (5.7:1 on the page background). Form controls use `input-border` (3.3:1); cards and table rules use `border`. Tokens live in `frontend/src/index.css` (`@theme`).

Charts: income `#217a4b`, expense `#b4473f`, net `#1a1a18` (dashed), previous period / context `#c9c8c3`. Series also differ by line style so they survive greyscale; legend text stays in `text-muted`.

## Typography

Plus Jakarta Sans for the app (it covers Vietnamese), weights 400/500/600. 14px body, table and label text; 12px captions and badges; 16px card titles; 24px page titles; 24px KPI values (20px when the value is longer than 13 characters). Numbers, amounts and dates use tabular figures (`.nums`). Sentence case everywhere; no tracked capitals.

The serif display face (Newsreader, `.display`) belongs to the sign-in and register pages only.

## Layout

Top navigation bar, 56px, white with a bottom border: five first-level items (Overview, Transactions, Budgets, Categories, Settings), the active one with a subtle grey fill and bold text. Content max width 1440px, 16–24px gutters. Lists open with the filter bar and the table in the first viewport; summary figures sit in one line or strip, never a row of KPI cards (KPI tiles are for the Overview only). Tables scroll inside their own container on narrow screens (with `relative` on the container); the Transactions list switches to one block per transaction below 768px.

## Elevation & Depth

Cards and panels: 1px border, no shadow. Only menus, dialogs and toasts cast a shadow. No gradients, blur or hover lift on app screens.

## Shapes

4px controls, 6px cards, 8px dialogs; fully rounded only for badges and filter chips.

## Components

Own small component set in `frontend/src/components/ui` (no shadcn): `Button` (primary, secondary, ghost, danger icon, destructive; `loading`), `Input`, `Select`, `MoneyInput` (grouped VND digits), `Segmented` (radio group), `Label` / `FieldError` / `FieldHint`, `Modal` (focus trap, returns focus), `ConfirmDialog`, `InlineAlert`, `EmptyState`, `ErrorState`, `Skeleton` / `TableSkeletonRows`, `Badge` (five tones), `PageHeader`, `Card` / `CardHeader`, toasts via `useToast()`. One icon set: lucide, 16px, `aria-hidden` beside text.

## Do's and Don'ts

- Do design first use, no results, loading and error (with Retry) for every list and widget. In development, `?state=empty|error|loading` forces them on Transactions and Budgets.
- Do confirm deletes in a dialog that names the record and the consequence, with focus on Cancel; show server errors inside the dialog.
- Do keep Save enabled until submit, show errors next to their field, keep the user's input when saving fails, and warn about unsaved changes (forms and the transaction dialog).
- Do announce successes with a toast that names the record; keep errors inline until fixed.
- Do keep filters, page, page size, month and period in the URL.
- Don't use ALL-CAPS labels, pie/donut charts, decorative icon circles, or colour as the only signal.
- Don't format money or dates by hand: use `frontend/src/lib/format.ts`; don't build a local day with `toISOString()`: use `frontend/src/lib/dates.ts`.

## Locale

- Languages: Vietnamese (`vi-VN`) and English (`en-GB`), chosen per user and saved to the profile.
- Currency: VND, no decimals. vi `1.250.000 ₫` · en `₫1,250,000`. A column whose header names VND shows the number alone (`1.250.000`).
- Dates: `dd/MM/yyyy` in both languages; date-time `dd/MM/yyyy HH:mm` (24-hour). Calendar days (`occurred_on`, budget dates) are formatted in UTC so no time zone moves them; local days are built with `lib/dates.ts`.
- Percent `44%`, changes `+12,5%`, rate changes in points (`+3,2 điểm %`).
- Chart axes only may use compact numbers (`1,2 Tr`), with the unit (VND) in the axis label.

## Status vocabulary

| Entity | Status | Tone |
|---|---|---|
| Budget | Safe (under 70% used) | success |
| Budget | Watch (70–89%) | warning |
| Budget | Tight (90–99%) | warning |
| Budget | Over (100% or more) | danger |
| Overview | Overspent (expense > income in the period) | danger |
| Transaction | Locked (recorded more than 24 hours ago; the API refuses edits) | neutral, with a lock icon and the reason |
| Category | Default (built in; cannot be renamed or deleted) | neutral, with a lock icon and the reason |
| Account | Verified / Unverified | success / warning |

Tones: neutral, info, success, warning, danger. Every status shows its text label. Transaction type (Income / Expense) is a plain text column, not a status; income amounts are green with "+", expenses ink with "-".

## Navigation

| Item | Route | Notes |
|---|---|---|
| Overview | `/` | `?period=this_month|last_month|3m|6m|custom&from&to` |
| Transactions | `/transactions` | `?type&category&method&from&to&page&size` |
| Budgets | `/budgets` | `?month=YYYY-MM` |
| Categories | `/categories` | |
| Settings | `/settings` | Profile, Password (not for Google accounts), Language |

## Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-11 | Keep the green brand but darken the accent to #217a4b; #3cb371 stays for the logo | White on #3cb371 was 2.67:1, below WCAG AA |
| 2026-11-11 | Top navigation instead of a sidebar | Five short first-level items; a personal app with no modules |
| 2026-11-11 | Settings stays one page with three sections, no left navigation | Only three sections; each has its own Save |
| 2026-11-11 | No bulk selection, export or search on Transactions | The API has no bulk delete, export or text search endpoint; add them in the API first |
| 2026-11-11 | Budget limits save on blur/Enter per row, with "Saved" status and inline errors | One field per row; a page-level Save bar would add a step for a single number |
| 2026-11-11 | Overview compares month presets with the previous calendar month(s) | Equal-length day windows compared November with 2–31 October |
| 2026-11-11 | "Tight" budgets use the warning tone, "Over" the danger tone | Danger is kept for limits that are already exceeded |
