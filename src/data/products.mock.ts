import type { Product } from '../types/product'

/**
 * SO this is my development seed data.
 *
 * This dataset provides a useful starting state for local development
 * and demonstrations. It is intentionally kept outside the application
 * component so production data sources can be introduced later without
 * coupling them to the UI.
 */
export const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Wireless Keyboard',
    sku: 'KB-001',
    category: 'Electronics',
    price: 18500,
    stock: 24,
    reorderLevel: 10,
  },
  {
    id: 2,
    name: 'USB-C Cable',
    sku: 'CB-002',
    category: 'Accessories',
    price: 4500,
    stock: 8,
    reorderLevel: 10,
  },
  {
    id: 3,
    name: 'Office Notebook',
    sku: 'NB-003',
    category: 'Stationery',
    price: 2500,
    stock: 42,
    reorderLevel: 15,
  },
  {
    id: 4,
    name: 'Wireless Mouse',
    sku: 'MS-004',
    category: 'Electronics',
    price: 12000,
    stock: 6,
    reorderLevel: 10,
  },
]