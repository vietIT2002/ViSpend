# Budget Effective Date

## Purpose

Category budgets can be created at different times in the same month. A budget created mid-month may represent the amount the user wants to control from that day through the end of the month, not the full-month limit.

## Business Rules

Each budget allocation belongs to one category in one calendar month and has its own `effective_from` date.

- `effective_from` must be inside the selected budget month.
- If the user chooses `Full month`, `effective_from` is the first day of that month.
- If the user chooses `From today`, `effective_from` is today's date when today is inside the selected month.
- Spending before `effective_from` is not counted against that allocation.
- Spending before `effective_from` is still shown separately as prior spending.
- Each category has its own effective date. Creating a Food budget today and a Transport budget five days later does not change the Food budget.
- Copying a previous month's plan creates allocations for the target month with `effective_from` set to the first day of the target month.

## Example

On June 21, the user has already spent 900,000 VND on Food & Drink from June 1 to June 20. The user creates a Food & Drink budget of 700,000 VND for the remaining days of June.

The system stores:

- `amount`: 700,000
- `effective_from`: 2026-06-21

The system displays:

- Budget: 700,000
- Spent from June 21: 0
- Remaining: 700,000
- Spent before budget start: 900,000

If the user later spends 100,000 VND on Food & Drink on June 22:

- Spent from June 21: 100,000
- Remaining: 600,000
- Spent before budget start: 900,000

## Reporting

Monthly budget totals sum the active category budget amounts. Budget usage and alerts are calculated from spending between each allocation's `effective_from` date and the end of the month.

Prior spending is informational. It helps the user understand total monthly behavior without making a mid-month budget appear over-limit immediately.
