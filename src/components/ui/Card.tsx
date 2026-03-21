import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  children,
  className,
  padding = 'md',
  hoverable = false,
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={clsx(
        'bg-white rounded-2xl border border-gray-100 shadow-sm',
        paddingClasses[padding],
        hoverable && 'transition-all duration-150 hover:shadow-md hover:border-gray-200 cursor-pointer',
        onClick && 'w-full text-left',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  accent?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = false,
  className,
}: StatCardProps) {
  const trendPositive = trend && trend.value >= 0;

  return (
    <Card
      className={clsx(
        accent && 'bg-gradient-to-br from-primary-600 to-primary-700 border-primary-600 text-white',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              'text-sm font-medium truncate',
              accent ? 'text-primary-100' : 'text-gray-500'
            )}
          >
            {title}
          </p>
          <p
            className={clsx(
              'text-2xl font-bold mt-1 truncate',
              accent ? 'text-white' : 'text-gray-900'
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={clsx(
                'text-xs mt-0.5 truncate',
                accent ? 'text-primary-200' : 'text-gray-400'
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className={clsx(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                trendPositive
                  ? accent
                    ? 'text-red-200'
                    : 'text-red-600'
                  : accent
                    ? 'text-green-200'
                    : 'text-green-600'
              )}
            >
              <span aria-hidden="true">{trendPositive ? '↑' : '↓'}</span>
              <span>
                {Math.abs(trend.value).toFixed(1)}% {trend.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'flex-shrink-0 p-2.5 rounded-xl',
              accent ? 'bg-white/20' : 'bg-primary-50 text-primary-600'
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
