import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Download, FileText, FileJson } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppContext } from '../hooks/useAppContext';
import { useToast } from './ui/Toast';
import type { CategoryId } from '../types';
import { getCategoryById } from '../utils/categories';
import { formatCurrency } from '../utils/formatters';
import { getLastNMonths } from '../utils/dateHelpers';
import {
  filterExpensesByMonth,
  calculateSummary,
  getTopCategories,
  buildCategoryChartData,
} from '../utils/expenseHelpers';
import { exportExpensesCSV, exportDataJSON } from '../utils/csvExport';
import { storage } from '../utils/storage';

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
        <p className="font-bold text-gray-900">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function ReportsView() {
  const { state } = useAppContext();
  const { showToast } = useToast();
  const [reportMonths, setReportMonths] = useState<3 | 6 | 12>(6);

  const months = useMemo(() => getLastNMonths(reportMonths), [reportMonths]);

  // Monthly totals
  const monthlyData = useMemo(() =>
    months.map((m) => {
      const expenses = filterExpensesByMonth(state.expenses, m);
      const summary = calculateSummary(expenses);
      const [y, mo] = m.split('-').map(Number);
      const monthName = new Date(y, mo - 1, 1).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      return { month: monthName, amount: summary.total, count: summary.count, key: m };
    }),
  [months, state.expenses]);

  // Category breakdown over period
  const periodExpenses = useMemo(() => {
    return months.flatMap((m) => filterExpensesByMonth(state.expenses, m));
  }, [months, state.expenses]);

  const periodSummary = useMemo(() => calculateSummary(periodExpenses), [periodExpenses]);

  const categoryBreakdown = useMemo(
    () => buildCategoryChartData(periodExpenses),
    [periodExpenses]
  );

  // Monthly category heatmap data
  const topCategoryIds = useMemo(
    () => getTopCategories(periodExpenses, 5).map((c) => c.categoryId),
    [periodExpenses]
  );

  const stackedData = useMemo(() =>
    months.map((m) => {
      const expenses = filterExpensesByMonth(state.expenses, m);
      const summary = calculateSummary(expenses);
      const [y2, mo2] = m.split('-').map(Number);
      const monthName = new Date(y2, mo2 - 1, 1).toLocaleDateString('en-US', {
        month: 'short',
      });
      const entry: Record<string, string | number> = { month: monthName };
      topCategoryIds.forEach((id) => {
        entry[id] = summary.byCategory[id] || 0;
      });
      return entry;
    }),
  [months, state.expenses, topCategoryIds]);

  const handleExportCSV = () => {
    if (state.expenses.length === 0) {
      showToast('No expenses to export', 'warning');
      return;
    }
    exportExpensesCSV(
      state.expenses,
      `spendwise-expenses-${new Date().toISOString().split('T')[0]}.csv`
    );
    showToast('CSV exported successfully', 'success');
  };

  const handleExportJSON = () => {
    if (state.expenses.length === 0) {
      showToast('No data to export', 'warning');
      return;
    }
    const data = storage.exportData();
    exportDataJSON(JSON.parse(data), `spendwise-backup-${new Date().toISOString().split('T')[0]}.json`);
    showToast('JSON backup exported', 'success');
  };

  const avgMonthlySpend =
    monthlyData.length > 0
      ? monthlyData.reduce((s, m) => s + m.amount, 0) / monthlyData.filter((m) => m.amount > 0).length || 0
      : 0;

  const highestMonth = monthlyData.reduce(
    (max, m) => (m.amount > max.amount ? m : max),
    { month: 'N/A', amount: 0, count: 0, key: '' }
  );

  const lowestMonth = monthlyData
    .filter((m) => m.amount > 0)
    .reduce(
      (min, m) => (m.amount < min.amount ? m : min),
      { month: 'N/A', amount: Infinity, count: 0, key: '' }
    );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Insights and spending analysis</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<FileText size={16} />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileJson size={16} />}
            onClick={handleExportJSON}
          >
            Backup JSON
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Period:</span>
        {([3, 6, 12] as const).map((n) => (
          <button
            key={n}
            onClick={() => setReportMonths(n)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              reportMonths === n
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {n} months
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-gray-500 font-medium">Total ({reportMonths}mo)</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(periodSummary.total)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{periodSummary.count} transactions</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 font-medium">Monthly Avg</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(isFinite(avgMonthlySpend) ? avgMonthlySpend : 0)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">per month</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 font-medium">Highest Month</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(highestMonth.amount)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{highestMonth.month}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 font-medium">Lowest Month</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(isFinite(lowestMonth.amount) ? lowestMonth.amount : 0)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{lowestMonth.month}</p>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card padding="none">
        <div className="p-5 pb-3">
          <h2 className="font-semibold text-gray-900">Monthly Spending</h2>
          <p className="text-xs text-gray-500 mt-0.5">Last {reportMonths} months</p>
        </div>
        <div className="h-56 px-3 pb-5">
          {monthlyData.some((d) => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {monthlyData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === monthlyData.length - 1 ? '#6366f1' : '#c7d2fe'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No data available for this period
            </div>
          )}
        </div>
      </Card>

      {/* Category Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="none">
          <div className="p-5 pb-3">
            <h2 className="font-semibold text-gray-900">Spending by Category</h2>
            <p className="text-xs text-gray-500 mt-0.5">Last {reportMonths} months</p>
          </div>
          <div className="h-56">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={50}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as (typeof categoryBreakdown)[0];
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
                            <p className="font-medium text-gray-700">
                              {d.icon} {d.name}
                            </p>
                            <p className="font-bold text-gray-900">{formatCurrency(d.amount)}</p>
                            <p className="text-gray-500">{d.percentage.toFixed(1)}% of total</p>
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
                No data available
              </div>
            )}
          </div>
        </Card>

        {/* Category List */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Category Breakdown</h2>
          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span aria-hidden="true">{cat.icon}</span>
                      <span className="text-sm text-gray-700 font-medium truncate">{cat.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(cat.amount)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">
              No expenses in this period
            </div>
          )}
        </Card>
      </div>

      {/* Stacked Category Chart */}
      {topCategoryIds.length > 0 && (
        <Card padding="none">
          <div className="p-5 pb-3">
            <h2 className="font-semibold text-gray-900">Category Trends</h2>
            <p className="text-xs text-gray-500 mt-0.5">Top categories month by month</p>
          </div>
          <div className="h-56 px-3 pb-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
                          <p className="font-medium text-gray-700 mb-2">{label}</p>
                          {payload.map((p, i) => {
                            const cat = getCategoryById(p.dataKey as CategoryId);
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="text-gray-600">{cat.name}:</span>
                                <span className="font-semibold">{formatCurrency(p.value as number)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {topCategoryIds.map((id) => {
                  const cat = getCategoryById(id);
                  return (
                    <Bar
                      key={id}
                      dataKey={id}
                      name={cat.name}
                      stackId="a"
                      fill={cat.color}
                      maxBarSize={60}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Export Section */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Download size={18} className="text-primary-600" aria-hidden="true" />
              Export Your Data
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Download your expense data for use in spreadsheets or as a backup.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              icon={<FileText size={15} />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<FileJson size={15} />}
              onClick={handleExportJSON}
            >
              Backup JSON
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
