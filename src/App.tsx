import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import './App.css'

import { ProductDetails } from './components/ProductDetails'
import { initialProducts } from './data/products.mock'
import type { Product } from './types/product'

/**
 * Product form state used by both the create and edit workflows.
 */
type ProductFormState = {
  name: string
  sku: string
  category: string
  price: string
  stock: string
  reorderLevel: string
}

/**
 * Represents a pending stock movement.
 */
type StockAdjustmentState = {
  productId: number
  quantity: string
  direction: 'increase' | 'decrease'
}

/**
 * Props required by the reusable product table.
 */
type ProductTableProps = {
  products: Product[]
  onView: (product: Product) => void
  onDelete: (id: number) => void
  onEdit: (product: Product) => void
  onAdjustStock: (product: Product) => void
  inventoryView?: boolean
}

const STORAGE_KEY = 'small-business-inventory-products'

const EMPTY_FORM: ProductFormState = {
  name: '',
  sku: '',
  category: '',
  price: '',
  stock: '',
  reorderLevel: '',
}

/**
 * Safely restores products from localStorage.
 *
 * A malformed localStorage entry should never prevent the application
 * from starting, so parsing is deliberately guarded.
 */
function loadProducts(): Product[] {
  try {
    const savedProducts = localStorage.getItem(STORAGE_KEY)

    if (!savedProducts) {
      return initialProducts
    }

    const parsedProducts: unknown = JSON.parse(savedProducts)

    if (!Array.isArray(parsedProducts)) {
      return initialProducts
    }

    return parsedProducts as Product[]
  } catch {
    return initialProducts
  }
}

function App() {
  const [products, setProducts] = useState<Product[]>(loadProducts)
  const [activePage, setActivePage] = useState('Dashboard')
  const [search, setSearch] = useState('')

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [showStockModal, setShowStockModal] = useState(false)
  const [stockAdjustment, setStockAdjustment] =
    useState<StockAdjustmentState | null>(null)

  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null)

  /**
   * Persist every inventory mutation locally.
   *
   * This gives the application durable browser-level persistence while
   * keeping the project intentionally backend-independent.
   */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim()

    if (!query) {
      return products
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query),
    )
  }, [products, search])

  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + product.stock, 0),
    [products],
  )

  const inventoryValue = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + product.price * product.stock,
        0,
      ),
    [products],
  )

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (product) => product.stock <= product.reorderLevel,
      ).length,
    [products],
  )

  const formatCurrency = useCallback(
  (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount),
  [],
)

  const resetProductForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setFormError('')
  }, [])

  const openAddProductForm = useCallback(() => {
    setEditingProduct(null)
    resetProductForm()
    setShowProductForm(true)
  }, [resetProductForm])

  const openEditProductForm = useCallback(
    (product: Product) => {
      setEditingProduct(product)
      setForm({
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: String(product.price),
        stock: String(product.stock),
        reorderLevel: String(product.reorderLevel),
      })
      setFormError('')
      setShowProductForm(true)
    },
    [],
  )

  const closeProductForm = useCallback(() => {
    setShowProductForm(false)
    setEditingProduct(null)
    resetProductForm()
  }, [resetProductForm])

  const updateFormField = useCallback(
    (field: keyof ProductFormState, value: string) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }))

      if (formError) {
        setFormError('')
      }
    },
    [formError],
  )

  /**
   * Handles both product creation and editing.
   *
   * SKU uniqueness is enforced at the application layer so that two
   * products cannot accidentally share the same inventory identifier.
   */
  const saveProduct = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const name = form.name.trim()
      const sku = form.sku.trim().toUpperCase()
      const category = form.category.trim() || 'Uncategorized'

      const price = Number(form.price)
      const stock = Number(form.stock)
      const reorderLevel = Number(form.reorderLevel || 10)

      if (!name || !sku || form.price === '' || form.stock === '') {
        setFormError('Please complete all required fields.')
        return
      }

      if (
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isFinite(stock) ||
        stock < 0 ||
        !Number.isFinite(reorderLevel) ||
        reorderLevel < 0
      ) {
        setFormError(
          'Price, stock, and reorder level must be valid values.',
        )
        return
      }

      const skuExists = products.some(
        (product) =>
          product.sku.toLowerCase() === sku.toLowerCase() &&
          product.id !== editingProduct?.id,
      )

      if (skuExists) {
        setFormError(`A product with SKU "${sku}" already exists.`)
        return
      }

      if (editingProduct) {
        setProducts((current) =>
          current.map((product) =>
            product.id === editingProduct.id
              ? {
                  ...product,
                  name,
                  sku,
                  category,
                  price,
                  stock,
                  reorderLevel,
                }
              : product,
          ),
        )
      } else {
        const newProduct: Product = {
          id: Date.now(),
          name,
          sku,
          category,
          price,
          stock,
          reorderLevel,
        }

        setProducts((current) => [...current, newProduct])
      }

      closeProductForm()
    },
    [closeProductForm, editingProduct, form, products],
  )

  const deleteProduct = useCallback(
    (id: number) => {
      const product = products.find((item) => item.id === id)

      if (!product) {
        return
      }

      const confirmed = window.confirm(
        `Delete "${product.name}" from the inventory?`,
      )

      if (!confirmed) {
        return
      }

      setProducts((current) =>
        current.filter((product) => product.id !== id),
      )
    },
    [products],
  )

  /**
   * Opens the product details view.
   */
  const openProductDetails = useCallback((product: Product) => {
    setSelectedProduct(product)
  }, [])

  /**
   * Closes the product details view.
   */
  const closeProductDetails = useCallback(() => {
    setSelectedProduct(null)
  }, [])

  /**
   * Opens the stock adjustment workflow for a specific product.
   */
  const openStockAdjustment = useCallback((product: Product) => {
    setStockAdjustment({
      productId: product.id,
      quantity: '',
      direction: 'increase',
    })
    setFormError('')
    setShowStockModal(true)
  }, [])

  const closeStockAdjustment = useCallback(() => {
    setShowStockModal(false)
    setStockAdjustment(null)
    setFormError('')
  }, [])

  const updateStockAdjustment = useCallback(
    (
      field: 'quantity' | 'direction',
      value: string | 'increase' | 'decrease',
    ) => {
      setStockAdjustment((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          [field]: value,
        }
      })

      setFormError('')
    },
    [],
  )

  /**
   * Applies a stock movement.
   *
   * Stock is never allowed to become negative. This rule belongs here
   * rather than in the UI so every stock adjustment follows the same
   * business constraint.
   */
  const applyStockAdjustment = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!stockAdjustment) {
        return
      }

      const quantity = Number(stockAdjustment.quantity)

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity)
      ) {
        setFormError('Enter a valid whole-number quantity greater than zero.')
        return
      }

      const product = products.find(
        (item) => item.id === stockAdjustment.productId,
      )

      if (!product) {
        setFormError('The selected product could not be found.')
        return
      }

      if (
        stockAdjustment.direction === 'decrease' &&
        quantity > product.stock
      ) {
        setFormError(
          `Cannot remove ${quantity} units. Only ${product.stock} units are currently in stock.`,
        )
        return
      }

      setProducts((current) =>
        current.map((item) => {
          if (item.id !== product.id) {
            return item
          }

          const updatedStock =
            stockAdjustment.direction === 'increase'
              ? item.stock + quantity
              : item.stock - quantity

          return {
            ...item,
            stock: updatedStock,
          }
        }),
      )

      closeStockAdjustment()
    },
    [closeStockAdjustment, products, stockAdjustment],
  )

  const handlePageChange = useCallback((page: string) => {
    setActivePage(page)
    setSearch('')
  }, [])

  const stockAdjustmentProduct = stockAdjustment
    ? products.find(
        (product) => product.id === stockAdjustment.productId,
      )
    : null

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>

          <div>
            <strong>Stockly</strong>
            <span>Inventory</span>
          </div>
        </div>

        <nav aria-label="Main navigation">
          <button
            className={
              activePage === 'Dashboard'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() => handlePageChange('Dashboard')}
          >
            <span aria-hidden="true">⌂</span>
            Dashboard
          </button>

          <button
            className={
              activePage === 'Products'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() => handlePageChange('Products')}
          >
            <span aria-hidden="true">□</span>
            Products
          </button>

          <button
            className={
              activePage === 'Inventory'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() => handlePageChange('Inventory')}
          >
            <span aria-hidden="true">▣</span>
            Inventory
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Inventory system online
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Business overview</p>
            <h1>{activePage}</h1>
          </div>

          <button
            className="primary-button"
            onClick={openAddProductForm}
          >
            + Add product
          </button>
        </header>

        {activePage === 'Dashboard' && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total products</span>
                <strong>{products.length}</strong>
                <span className="stat-note">
                  Products in catalog
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Total stock</span>
                <strong>{totalStock}</strong>
                <span className="stat-note">
                  Units currently available
                </span>
              </div>

              <div className="stat-card warning">
                <span className="stat-label">Low stock</span>
                <strong>{lowStockCount}</strong>
                <span className="stat-note">
                  Needs attention
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Inventory value</span>
                <strong>{formatCurrency(inventoryValue)}</strong>
                <span className="stat-note">
                  Current stock value
                </span>
              </div>
            </section>

            <section className="content-card">
              <div className="section-header">
                <div>
                  <h2>Recent inventory</h2>
                  <p>
                    Overview of products currently in stock.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => handlePageChange('Products')}
                >
                  View all
                </button>
              </div>

              <ProductTable
                products={products.slice(0, 5)}
                onView={openProductDetails}
                onDelete={deleteProduct}
                onEdit={openEditProductForm}
                onAdjustStock={openStockAdjustment}
              />
            </section>
          </>
        )}

        {activePage === 'Products' && (
          <section className="content-card">
            <div className="section-header">
              <div>
                <h2>Products</h2>
                <p>
                  Manage your products and stock information.
                </p>
              </div>

              <div className="search-wrapper">
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search products..."
                  aria-label="Search products"
                />
              </div>
            </div>

            <ProductTable
              products={filteredProducts}
              onView={openProductDetails}
              onDelete={deleteProduct}
              onEdit={openEditProductForm}
              onAdjustStock={openStockAdjustment}
            />
          </section>
        )}

        {activePage === 'Inventory' && (
          <section className="content-card">
            <div className="section-header">
              <div>
                <h2>Inventory levels</h2>
                <p>
                  Monitor stock and identify products that need
                  replenishment.
                </p>
              </div>
            </div>

            <ProductTable
              products={products}
              onView={openProductDetails}
              onDelete={deleteProduct}
              onEdit={openEditProductForm}
              onAdjustStock={openStockAdjustment}
              inventoryView
            />
          </section>
        )}
      </main>

      {/* Product details view */}
      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={closeProductDetails}
          onEdit={(product) => {
            setSelectedProduct(null)
            openEditProductForm(product)
          }}
          onAdjustStock={(product) => {
            setSelectedProduct(null)
            openStockAdjustment(product)
          }}
        />
      )}

      {/* Product creation/editing modal */}
      {showProductForm && (
        <div
          className="modal-backdrop"
          onClick={closeProductForm}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="product-form-title">
                  {editingProduct
                    ? 'Edit product'
                    : 'Add product'}
                </h2>

                <p>
                  {editingProduct
                    ? 'Update product information and inventory settings.'
                    : 'Add a new item to your inventory.'}
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeProductForm}
                aria-label="Close product form"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct} noValidate>
              {formError && (
                <div className="form-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="form-grid">
                <label>
                  Product name
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateFormField(
                        'name',
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Bluetooth Speaker"
                    required
                    autoFocus
                  />
                </label>

                <label>
                  SKU
                  <input
                    value={form.sku}
                    onChange={(event) =>
                      updateFormField(
                        'sku',
                        event.target.value,
                      )
                    }
                    placeholder="e.g. SP-005"
                    required
                  />
                </label>

                <label>
                  Category
                  <input
                    value={form.category}
                    onChange={(event) =>
                      updateFormField(
                        'category',
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Electronics"
                  />
                </label>

                <label>
                  Price (₦)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) =>
                      updateFormField(
                        'price',
                        event.target.value,
                      )
                    }
                    placeholder="15000"
                    required
                  />
                </label>

                <label>
                  Stock
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(event) =>
                      updateFormField(
                        'stock',
                        event.target.value,
                      )
                    }
                    placeholder="25"
                    required
                  />
                </label>

                <label>
                  Reorder level
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.reorderLevel}
                    onChange={(event) =>
                      updateFormField(
                        'reorderLevel',
                        event.target.value,
                      )
                    }
                    placeholder="10"
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeProductForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingProduct
                    ? 'Save changes'
                    : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory stock movement modal */}
      {showStockModal && stockAdjustment && (
        <div
          className="modal-backdrop"
          onClick={closeStockAdjustment}
          role="presentation"
        >
          <div
            className="modal stock-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-adjustment-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="stock-adjustment-title">
                  Adjust stock
                </h2>

                <p>
                  {stockAdjustmentProduct?.name ??
                    'Selected product'}
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeStockAdjustment}
                aria-label="Close stock adjustment"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={applyStockAdjustment}
              noValidate
            >
              {formError && (
                <div className="form-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="stock-summary">
                <span>Current stock</span>
                <strong>
                  {stockAdjustmentProduct?.stock ?? 0}
                </strong>
              </div>

              <label>
                Adjustment type
                <select
                  value={stockAdjustment.direction}
                  onChange={(event) =>
                    updateStockAdjustment(
                      'direction',
                      event.target.value as
                        | 'increase'
                        | 'decrease',
                    )
                  }
                >
                  <option value="increase">
                    Increase stock
                  </option>
                  <option value="decrease">
                    Decrease stock
                  </option>
                </select>
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stockAdjustment.quantity}
                  onChange={(event) =>
                    updateStockAdjustment(
                      'quantity',
                      event.target.value,
                    )
                  }
                  placeholder="Enter quantity"
                  required
                  autoFocus
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeStockAdjustment}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Update stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductTable({
  products,
  onView,
  onDelete,
  onEdit,
  onAdjustStock,
  inventoryView = false,
}: ProductTableProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)

  if (products.length === 0) {
    return (
      <div className="empty-state">
        No products found.
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => {
            const isLowStock =
              product.stock <= product.reorderLevel

            return (
              <tr key={product.id}>
                <td>
                  <div className="product-name">
                    <div className="product-icon">
                      {product.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <strong>{product.name}</strong>
                  </div>
                </td>

                <td className="muted">{product.sku}</td>

                <td className="muted">
                  {product.category}
                </td>

                <td>{formatCurrency(product.price)}</td>

                <td>
                  <strong>{product.stock}</strong>
                </td>

                <td>
                  <span
                    className={
                      isLowStock
                        ? 'badge low'
                        : 'badge good'
                    }
                  >
                    {isLowStock
                      ? 'Low stock'
                      : 'In stock'}
                  </span>
                </td>

                <td>
                  <div className="table-actions">
                    <button
                      className="action-button"
                      onClick={() =>
                        onView(product)
                      }
                    >
                      View
                    </button>

                    <button
                      className="action-button"
                      onClick={() =>
                        onAdjustStock(product)
                      }
                    >
                      Adjust
                    </button>

                    <button
                      className="action-button"
                      onClick={() =>
                        onEdit(product)
                      }
                    >
                      Edit
                    </button>

                    {!inventoryView && (
                      <button
                        className="delete-button"
                        onClick={() =>
                          onDelete(product.id)
                        }
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default App