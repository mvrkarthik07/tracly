import { useMemo } from 'react';
import type { Transaction } from '../api/client';
import { CATEGORIES, type Category } from '../constants/categories';

type Props = { selectedCategory: Category | null; onSelect: (category: Category) => void; transactions?: Transaction[]; categories?: readonly Category[] };

export function CategoryChips({ selectedCategory, onSelect, transactions = [], categories }: Props) {
  const chipCategories = useMemo(() => {
    if (categories) return [...categories];
    const counts = new Map<Category, number>();
    for (const transaction of transactions) {
      if (CATEGORIES.includes(transaction.category as Category)) {
        const category = transaction.category as Category;
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    const mostUsed = Array.from(counts, ([category]) => category).sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0));
    return mostUsed.length >= 5 ? mostUsed.slice(0, 5) : [...CATEGORIES];
  }, [categories, transactions]);

  return <div className="category-chips" aria-label="Transaction category"><span className="category-chip-label">CATEGORY</span>{chipCategories.map((category) => <button type="button" className={`category-chip${selectedCategory === category ? ' selected' : ''}`} key={category} onClick={() => onSelect(category)}>{category}</button>)}</div>;
}
