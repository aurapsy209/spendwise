import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Plus, TrendingUp, TrendingDown, Receipt, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, StatCard } from './ui/Card';
import { Button } from './ui/Button';
import { CategoryBadge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { Modal } from './ui/Modal';
import { ExpenseForm } from './ExpenseForm';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from './ui/Toast';
import type { Expense } from '../types';
import { getCategoryById } from '../utils/categories';
import {
  formatDateShort,
  formatMonthYear,
} from '../utils/formatters';
import { formatWithCurrency } from '../utils/currencies';
import {
  getDailyTotals,
  getPreviousMonth,
  getNextMonth,
  isCurrentMonth,
  getLastNMonths,
  getLastNDays,
} from '../utils/dateHelpers';
import {
  filterExpensesByMonth,
  calculateSummary,
  percentageChange,
  buildCategoryChartData,
} from '../utils/expenseHelpers';

// Custom tooltip for charts
const CustomTooltip = ({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
  currency: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="text-gray-900 font-semibold">
            {formatWithCurrency(p.value, currency)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom pie label
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
      fontSize={11}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function Dashboard() {
  const { state, addExpense, currentMonthExpenses, currentMonthSummary, budgetStatuses, setSelectedMonth, setActiveView, setListMonthFilter, homeCurrency } =
    useAppContext();
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);

  const { selectedMonth } = state;

  // Previous month data for comparison
  const prevMonth = getPreviousMonth(selectedMonth);
  const prevMonthExpenses = useMemo(
    () => filterExpensesByMonth(state.expenses, prevMonth),
    [state.expenses, prevMonth]
  );
  const prevMonthSummary = useMemo(
    () => calculateSummary(prevMonthExpenses),
    [prevMonthExpenses]
  );

  // Daily spending data for the area chart (always last 14 calendar days, crossing month boundaries)
  const last14Days = useMemo(() => getLastNDays(14), []);

  const dailyData = useMemo(
    () =>
      getDailyTotals(state.expenses, last14Days).map((d) => ({
        date: formatDateShort(d.date),
        amount: d.amount,
      })),
    [state.expenses, last14Days]
  );

  // Pie chart data — splits custom categories into their own slices
  const pieData = useMemo(
    () => buildCategoryChartData(currentMonthExpenses).map((c) => ({
      name: c.name,
      value: c.amount,
      color: c.color,
      icon: c.icon,
    })),
    [currentMonthExpenses]
  );

  // Monthly comparison (last 6 months)
  const monthlyData = useMemo(() => {
    const months = getLastNMonths(6);
    return months.map((m) => {
      const expenses = filterExpensesByMonth(state.expenses, m);
      const summary = calculateSummary(expenses);
      const [y, mo] = m.split('-').map(Number);
      const monthName = new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'short' });
      return {
        month: monthName,
        amount: summary.total,
        monthKey: m,
      };
    });
  }, [state.expenses]);

  const spendingChange = percentageChange(
    currentMonthSummary.total,
    prevMonthSummary.total
  );

  const totalBudget = state.budgets.reduce((s, b) => s + b.amount, 0);
  const budgetRemaining = totalBudget - currentMonthSummary.total;

  const handleAddExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    addExpense(data);
    setShowAddModal(false);
    showToast('Expense added!', 'success');
  };

  const canGoNext = !isCurrentMonth(selectedMonth);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your financial overview</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Expense
        </Button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5">
        <button
          onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="text-center">
          <span className="font-semibold text-gray-900 text-sm">
            {formatMonthYear(selectedMonth)}
          </span>
          {isCurrentMonth(selectedMonth) && (
            <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
              Current
            </span>
          )}
        </div>
        <button
          onClick={() => !canGoNext ? undefined : setSelectedMonth(getNextMonth(selectedMonth))}
          className={`p-1.5 rounded-lg transition-colors ${
            canGoNext
              ? 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              : 'text-gray-200 cursor-not-allowed'
          }`}
          aria-label="Next month"
          disabled={!canGoNext}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Spent"
          value={formatWithCurrency(currentMonthSummary.total, homeCurrency)}
          subtitle={formatMonthYear(selectedMonth)}
          icon={<Receipt size={20} />}
          trend={
            prevMonthSummary.total > 0 || currentMonthSummary.total > 0
              ? { value: spendingChange, label: 'vs last month' }
              : undefined
          }
          accent
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          title="Transactions"
          value={String(currentMonthSummary.count)}
          subtitle={`Avg ${
            currentMonthSummary.count > 0
              ? formatWithCurrency(currentMonthSummary.total / currentMonthSummary.count, homeCurrency)
              : '$0'
          } each`}
          icon={<TrendingUp size={20} />}
          onClick={() => { setListMonthFilter(selectedMonth); setActiveView('expenses'); }}
        />
        <StatCard
          title="Budget"
          value={formatWithCurrency(totalBudget, homeCurrency)}
          subtitle={
            totalBudget > 0
              ? `${Math.round((currentMonthSummary.total / totalBudget) * 100)}% used`
              : 'No budget set'
          }
          icon={<Target size={20} />}
          onClick={() => setActiveView('budgets')}
        />
        <StatCard
          title="Remaining"
          value={formatWithCurrency(Math.max(budgetRemaining, 0), homeCurrency)}
          subtitle={budgetRemaining < 0 ? `${formatWithCurrency(Math.abs(budgetRemaining), homeCurrency)} over` : 'Available'}
          icon={<TrendingDown size={20} />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily Spending Chart */}
        <Card className="lg:col-span-2" padding="none">
          <div className="p-5 pb-3">
            <h2 className="font-semibold text-gray-900">Spending Trend</h2>
            <p className="text-xs text-gray-500 mt-0.5">Last 14 days</p>
          </div>
          <div className="h-52 px-2 pb-4">
            {dailyData.some((d) => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip currency={homeCurrency} />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#colorAmount)"
                    dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#4f46e5' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No spending data for this period
              </div>
            )}
          </div>
        </Card>

        {/* Category Pie Chart */}
        <Card padding="none">
          <div className="p-5 pb-3">
            <h2 className="font-semibold text-gray-900">By Category</h2>
            <p className="text-xs text-gray-500 mt-0.5">{formatMonthYear(selectedMonth)}</p>
          </div>
          <div className="h-52 px-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as typeof pieData[0];
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
                            <p className="font-medium text-gray-700">
                              {d.icon} {d.name}
                            </p>
                            <p className="font-bold text-gray-900">{formatWithCurrency(d.value, homeCurrency)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No data this month
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-5 pb-4 space-y-1.5 max-h-24 overflow-y-auto">
            {pieData.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="text-gray-600 truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900 flex-shrink-0">
                  {formatWithCurrency(item.value, homeCurrency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card padding="none">
        <div className="p-5 pb-3">
          <h2 className="font-semibold text-gray-900">Monthly Comparison</h2>
          <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
        </div>
        <div className="h-48 px-3 pb-4">
          {monthlyData.some((d) => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip currency={homeCurrency} />} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.monthKey === selectedMonth ? '#6366f1' : '#e0e7ff'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No spending history yet
            </div>
          )}
        </div>
      </Card>

      {/* Budget Overview */}
      {budgetStatuses.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Budget Overview</h2>
          <div className="space-y-3">
            {budgetStatuses.slice(0, 5).map((status) => {
              const category = getCategoryById(status.categoryId);
              return (
                <div key={status.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span aria-hidden="true">{category.icon}</span>
                      <span className="text-gray-700 font-medium truncate">{category.name}</span>
                    </div>
                    <span className="text-gray-500 flex-shrink-0 text-xs">
                      {formatWithCurrency(status.spentAmount, homeCurrency)} / {formatWithCurrency(status.budgetAmount, homeCurrency)}
                    </span>
                  </div>
                  <ProgressBar value={status.percentage} size="sm" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Expenses */}
      {currentMonthExpenses.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Expenses</h2>
            <button
              onClick={() => { setListMonthFilter(selectedMonth); setActiveView('expenses'); }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {currentMonthExpenses
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((expense) => {
                const category = getCategoryById(expense.categoryId);
                return (
                  <div key={expense.id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-gray-50 flex-shrink-0"
                      aria-hidden="true"
                    >
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <CategoryBadge categoryId={expense.categoryId} customCategory={expense.customCategory} size="sm" showIcon={false} />
                    <span className="font-bold text-gray-900 text-sm flex-shrink-0">
                      {formatWithCurrency(expense.amount, expense.currency ?? homeCurrency)}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Expense"
        description="Track a new expense"
      >
        <ExpenseForm
          onSubmit={handleAddExpense}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}
