import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Receipt, Target, BarChart2, Loader2 } from 'lucide-react';
import { Sidebar, TopBar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { BudgetView } from './components/BudgetView';
import { ReportsView } from './components/ReportsView';
import { ToastProvider } from './components/ui/Toast';
import { AuthPage } from './components/auth/AuthPage';
import { ExpenseContext } from './hooks/useAppContext';
import { useExpenses } from './hooks/useExpenses';
import { useAuth } from './hooks/useAuth';
import { useAppContext } from './hooks/useAppContext';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { getSampleExpenses } from './utils/expenseHelpers';
import type { ActiveView } from './types';
import { clsx } from 'clsx';
import { Sparkles } from 'lucide-react';

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
const mobileNavItems: Array<{ id: ActiveView; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { id: 'expenses', label: 'Expenses', icon: <Receipt size={20} /> },
  { id: 'budgets', label: 'Budgets', icon: <Target size={20} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart2 size={20} /> },
];

function MobileBottomNav() {
  const { state, setActiveView } = useAppContext();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-lg lg:hidden pb-safe"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {mobileNavItems.map((item) => {
          const isActive = state.activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-150',
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={clsx(
                  'transition-transform duration-150',
                  isActive && 'scale-110'
                )}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span
                className={clsx(
                  'text-xs font-medium',
                  isActive ? 'text-primary-600' : 'text-gray-400'
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 w-8 h-0.5 bg-primary-600 rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────
function WelcomeModal() {
  const { state, importData, isLoading } = useAppContext();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && state.expenses.length === 0) {
      setOpen(true);
    }
  }, [isLoading, state.expenses.length]);

  const handleLoadSample = () => {
    importData(getSampleExpenses(), [
      { categoryId: 'food', amount: 400, period: 'monthly' },
      { categoryId: 'transport', amount: 150, period: 'monthly' },
      { categoryId: 'entertainment', amount: 100, period: 'monthly' },
      { categoryId: 'bills', amount: 500, period: 'monthly' },
      { categoryId: 'shopping', amount: 200, period: 'monthly' },
    ]);
    setOpen(false);
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Welcome to SpendWise!"
      description="Your personal expense tracker"
      size="sm"
    >
      <div className="space-y-5">
        <div className="space-y-3">
          {[
            { emoji: '📊', title: 'Beautiful Dashboard', desc: 'Visualize spending with interactive charts' },
            { emoji: '💰', title: 'Budget Tracking', desc: 'Set monthly limits per category' },
            { emoji: '☁️', title: 'Cloud Sync', desc: 'Your data syncs across all your devices' },
            { emoji: '📥', title: 'Export Anytime', desc: 'Download your data as CSV or JSON backup' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0" aria-hidden="true">{f.emoji}</span>
              <div>
                <p className="font-medium text-gray-900 text-sm">{f.title}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 space-y-2">
          <Button
            variant="primary"
            fullWidth
            icon={<Sparkles size={16} />}
            onClick={handleLoadSample}
          >
            Load Sample Data
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>
            Start Fresh
          </Button>
        </div>
        <p className="text-xs text-center text-gray-400">
          Sample data can be cleared from Reports › Export
        </p>
      </div>
    </Modal>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────
interface MainViewProps {
  onSignOut: () => void;
  userEmail: string;
}

function MainView({ onSignOut, userEmail }: MainViewProps) {
  const { state, isLoading } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderView = () => {
    switch (state.activeView) {
      case 'dashboard':  return <Dashboard />;
      case 'expenses':   return <ExpenseList />;
      case 'budgets':    return <BudgetView />;
      case 'reports':    return <ReportsView />;
      default:           return <Dashboard />;
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 flex">
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        onSignOut={onSignOut}
        userEmail={userEmail}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main
          className="flex-1 px-4 py-5 lg:px-6 lg:py-6 max-w-5xl mx-auto w-full pb-24 lg:pb-6"
          id="main-content"
          tabIndex={-1}
          aria-label={`${state.activeView} page`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-primary-500" />
            </div>
          ) : (
            renderView()
          )}
        </main>
      </div>

      <MobileBottomNav />
      <WelcomeModal />
    </div>
  );
}

// ─── App With Data ────────────────────────────────────────────────────────────
interface AppWithDataProps {
  userId: string;
  userEmail: string;
  onSignOut: () => void;
}

function AppWithData({ userId, userEmail, onSignOut }: AppWithDataProps) {
  const expenseData = useExpenses(userId);

  return (
    <ExpenseContext.Provider value={expenseData}>
      <ToastProvider>
        <MainView onSignOut={onSignOut} userEmail={userEmail} />
      </ToastProvider>
    </ExpenseContext.Provider>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const { session, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage onSignIn={signIn} onSignUp={signUp} />;
  }

  return (
    <AppWithData
      userId={session.user.id}
      userEmail={session.user.email ?? ''}
      onSignOut={signOut}
    />
  );
}

export default App;
