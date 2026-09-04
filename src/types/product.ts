
/**
 * THis Represents a product managed by the inventory system.
 *
 * Keeping the domain type separate from the UI allows the same model
 * to be reused by tables, forms, services, and future API integrations.
 */
export type Product = {
  id: number
  name: string
  sku: string
  category: string
  price: number
  stock: number
  reorderLevel: number
}

