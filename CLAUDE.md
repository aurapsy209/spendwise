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
- Add/edit/delete expenses with category, amount, date, notes
- 10 built-in categories (Food, Transport, Bills, Entertainment, etc.)
- Budget setting per category with visual progress bars
- Monthly/weekly/daily expense views
- Search, filter, sort expense list
- Reports with 3/6/12 month breakdowns
- CSV and JSON export
- Welcome modal with 25 sample expenses pre-loaded
- Mobile-first responsive design with bottom nav on mobile
- WCAG 2.1 AA accessibility (focus trapping, aria labels, skip-link)
- Supabase cloud sync — data persists across devices
- User authentication (email/password via Supabase Auth)

## Improvements Log

| Date | Improvement | Status |
|------|-------------|--------|
| 2026-03-17 | Initial build — full app scaffolded | Done |
| 2026-03-18 | CLAUDE.md updated with architecture docs, lint command, and improvement tracking | Done |
| 2026-03-19 | Supabase integration — auth, cloud DB, replaced localStorage | Done |
| 2026-03-20 | Custom categories — saved per user in Supabase, appear as own pie chart slices | Done |
| 2026-03-20 | Fixed month label timezone bug — chart bars were showing wrong month name | Done |

## Planned Improvements
- [ ] Dark mode toggle
- [ ] Recurring expenses support
- [ ] Multi-currency support
- [ ] Tags/custom labels on expenses
- [ ] Email/PDF report export
- [x] User authentication (Supabase Auth)
- [x] Cloud sync for multi-device support
- [ ] Notifications/reminders for budget thresholds
