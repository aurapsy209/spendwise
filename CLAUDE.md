# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# SpendWise — Expense Tracker SaaS

## Project Overview
A SaaS expense tracking web app built with React + TypeScript + Vite. No backend — uses localStorage for persistence.

## Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS (indigo/purple theme)
- **Charts**: Recharts
- **State**: useReducer + React Context
- **Storage**: Supabase (PostgreSQL) — replaces localStorage
- **Auth**: Supabase Auth (email/password)

## Project Structure
```
expense-tracker/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (Button, Modal, Card, etc.)
│   │   ├── Dashboard.tsx    # Main dashboard with charts and stats
│   │   ├── ExpenseList.tsx  # Searchable, filterable expense list
│   │   ├── ExpenseForm.tsx  # Add/edit expense form
│   │   ├── BudgetView.tsx   # Budget overview with progress bars
│   │   ├── BudgetForm.tsx   # Add/edit budget form
│   │   ├── ReportsView.tsx  # Reports with CSV/JSON export
│   │   └── Sidebar.tsx      # Navigation sidebar + mobile bottom nav
│   ├── hooks/
│   │   ├── useExpenses.ts   # Core state management (useReducer + Supabase sync)
│   │   ├── useAuth.ts       # Supabase auth session management
│   │   └── useAppContext.ts # React Context for global state
│   ├── lib/
│   │   └── supabase.ts      # Supabase client + DB↔app type mappers
│   ├── components/
│   │   └── auth/
│   │       └── AuthPage.tsx # Login/signup page
│   ├── utils/
│   │   ├── categories.ts    # 10 expense categories with colors/icons
│   │   ├── formatters.ts    # Currency, date, percentage formatters
│   │   ├── dateHelpers.ts   # Date range helpers
│   │   ├── expenseHelpers.ts# Filtering, sorting, summarizing
│   │   ├── storage.ts       # localStorage abstraction (legacy, unused)
│   │   └── csvExport.ts     # CSV and JSON export
│   ├── types/index.ts       # TypeScript types
│   ├── App.tsx              # Root component, view routing, welcome modal
│   └── main.tsx             # Entry point with skip-link
├── CLAUDE.md                # This file
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── index.html
```

## Commands
```bash
npm install       # Install dependencies
npm run dev       # Start dev server → http://localhost:5173
npm run build     # Type-check + production build (tsc && vite build)
npm run lint      # ESLint (zero warnings policy)
npm run preview   # Preview production build
```

## Architecture & State Flow

All app state lives in `useExpenses.ts` (useReducer). `useAppContext.ts` wraps it in a React Context so any component can read state and call actions without prop-drilling.

**Auth flow:** `useAuth.ts` manages the Supabase session. `App.tsx` checks auth first — unauthenticated users see `AuthPage`. Once authenticated, `AppWithData` mounts with `userId` and passes it to `useExpenses(userId)`.

**Data flow:**
1. User action → component calls action from `useAppContext` (e.g. `addExpense`)
2. `useExpenses` dispatches to `appReducer` → optimistic UI update immediately
3. Supabase call happens async in the background; on error, the optimistic update is rolled back
4. On initial load, data is fetched from Supabase and loaded via `IMPORT_DATA` dispatch
5. Derived data (summaries, budget statuses) is computed via `useMemo` in `useExpenses` and exposed through context

**Supabase DB columns** use snake_case; app types use camelCase. Mapping happens in `src/lib/supabase.ts` via `toExpense`, `toDbExpense`, `toBudget`, `toDbBudget`.

**Key type constraints:**
- `Expense.date` is always `YYYY-MM-DD` string (no time component)
- `selectedMonth` is always `YYYY-MM` string
- `Budget.period` is always `'monthly'` (yearly/weekly not yet supported)
- `CategoryId` is a fixed union — adding a category requires updating both `types/index.ts` and `utils/categories.ts`

**Adding a new view:** add the view name to `ActiveView` in `types/index.ts`, add a nav item in `Sidebar.tsx`, and add a render case in `App.tsx`.

## Features
- Dashboard with stat cards, area chart, pie chart, 6-month bar chart
- Transactions stat card navigates to Expenses page filtered to current month
- Budget stat card navigates to Budget page
- Add/edit/delete expenses with category, amount, date, notes
- 10 built-in categories (Food, Transport, Bills, Entertainment, etc.)
- Custom categories saved per user in Supabase (`user_categories` table), selectable in future expenses
- Budget setting per category with visual progress bars
- Sort expenses by date (newest/oldest) or amount (highest/lowest)
- Custom date range filter (start date / end date) on Expenses page
- Search and category filter on Expenses page
- Reports with 3/6/12 month breakdowns — custom categories shown as own slices
- CSV and JSON export
- Mobile-first responsive design with bottom nav on mobile
- WCAG 2.1 AA accessibility (focus trapping, aria labels, skip-link)
- Supabase cloud sync — data persists across devices
- User authentication (email/password via Supabase Auth)
- PWA — installable on Android and iPhone via browser "Add to Home Screen"

## Supabase Tables
| Table | Purpose |
|-------|---------|
| `expenses` | All expense records, RLS per user |
| `budgets` | Per-category monthly budgets, RLS per user |
| `user_categories` | Custom category names per user, RLS per user |
| `user_settings` | Per-user settings (home_currency), RLS per user |
| `recurring_expenses` | Recurring expense templates, auto-generates expenses on load, RLS per user |

## Improvements Log

| Date | Improvement | Status |
|------|-------------|--------|
| 2026-04-09 | Initial build — full app scaffolded | Done |
| 2026-04-09 | Supabase integration — auth, cloud DB, replaced localStorage | Done |
| 2026-04-09 | Custom categories — saved per user in Supabase, appear as own pie chart slices | Done |
| 2026-04-09 | Fixed month label timezone bug — chart bars were showing wrong month name | Done |
| 2026-04-09 | PWA setup — app installable on Android and iPhone | Done |
| 2026-04-09 | Expense list: added oldest-first and lowest-amount sort options | Done |
| 2026-04-09 | Expense list: added custom date range filter (From / To) | Done |
| 2026-04-09 | Category display fix — custom categories show as own chart slices in dashboard and reports | Done |
| 2026-04-09 | Dashboard navigation — Transactions card links to Expenses filtered by month | Done |
| 2026-04-09 | Dashboard navigation — Budget card links to Budget page | Done |
| 2026-04-09 | Multi-currency support — 20 currencies, per-expense exchange rate, home currency selector in sidebar | Done |
| 2026-04-09 | Recurring expenses — daily/weekly/monthly/yearly, auto-generates missed expenses on load, pause/resume/delete | Done |

## Planned Improvements
- [ ] Dark mode toggle
- [ ] Email/PDF report export
- [ ] Notifications/reminders for budget thresholds
- [x] User authentication (Supabase Auth)
- [x] Cloud sync for multi-device support
- [x] Custom categories per user
- [x] PWA (installable on mobile)
- [x] Multi-currency support (20 currencies, exchange rate per expense, home currency setting)
- [x] Recurring expenses (daily/weekly/monthly/yearly, auto-generates on load)
