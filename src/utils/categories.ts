import type { Category, CategoryId } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: '🍽️',
    color: '#f97316',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚗',
    color: '#3b82f6',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '🎬',
    color: '#a855f7',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    icon: '⚡',
    color: '#eab308',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    color: '#ef4444',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    color: '#ec4899',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
  {
    id: 'education',
    name: 'Education',
    icon: '📚',
    color: '#14b8a6',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    color: '#06b6d4',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
  },
  {
    id: 'fitness',
    name: 'Fitness',
    icon: '💪',
    color: '#22c55e',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📦',
    color: '#6b7280',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
];

export const getCategoryById = (id: CategoryId): Category => {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
};

export const getCategoryColor = (id: CategoryId): string => {
  return getCategoryById(id).color;
};

export const getCategoryDisplayName = (id: CategoryId, customCategory?: string): string => {
  if (id === 'other' && customCategory?.trim()) return customCategory.trim();
  return getCategoryById(id).name;
};
