import React from 'react';
import { clsx } from 'clsx';
import type { CategoryId } from '../../types';
import { getCategoryById } from '../../utils/categories';

interface CategoryBadgeProps {
  categoryId: CategoryId;
  customCategory?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function CategoryBadge({
  categoryId,
  customCategory,
  size = 'md',
  showIcon = true,
}: CategoryBadgeProps) {
  const category = getCategoryById(categoryId);
  const displayName = (categoryId === 'other' && customCategory?.trim())
    ? customCategory.trim()
    : category.name;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium rounded-full',
        category.bgColor,
        category.textColor,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {showIcon && <span aria-hidden="true">{category.icon}</span>}
      {displayName}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

const variantClasses = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-700',
};

export function Badge({ children, variant = 'neutral', size = 'md' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {children}
    </span>
  );
}
