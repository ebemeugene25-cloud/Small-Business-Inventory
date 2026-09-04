import type { Product } from '../types/product'

type ProductDetailsProps = {
  product: Product
  onClose: () => void
  onEdit: (product: Product) => void
  onAdjustStock: (product: Product) => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ProductDetails({
  product,
  onClose,
  onEdit,
  onAdjustStock,
}: ProductDetailsProps) {
  const isLowStock = product.stock <= product.reorderLevel
  const inventoryValue = product.price * product.stock

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal product-details-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Product details</p>
            <h2 id="product-details-title">{product.name}</h2>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close product details"
          >
            ×
          </button>
        </div>

        <div className="product-details-grid">
          <div className="detail-item">
            <span>SKU</span>
            <strong>{product.sku}</strong>
          </div>

          <div className="detail-item">
            <span>Category</span>
            <strong>{product.category}</strong>
          </div>

          <div className="detail-item">
            <span>Selling price</span>
            <strong>{formatCurrency(product.price)}</strong>
          </div>

          <div className="detail-item">
            <span>Current stock</span>
            <strong>{product.stock}</strong>
          </div>

          <div className="detail-item">
            <span>Reorder level</span>
            <strong>{product.reorderLevel}</strong>
          </div>

          <div className="detail-item">
            <span>Inventory value</span>
            <strong>{formatCurrency(inventoryValue)}</strong>
          </div>
        </div>

        <div className="product-status-card">
          <div>
            <span className="detail-label">Stock status</span>
            <strong>
              {isLowStock ? 'Low stock' : 'In stock'}
            </strong>
          </div>

          <span className={`status-badge ${isLowStock ? 'low' : 'healthy'}`}>
            {isLowStock ? 'Needs attention' : 'Healthy'}
          </span>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onAdjustStock(product)}
          >
            Adjust Stock
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={() => onEdit(product)}
          >
            Edit Product
          </button>
        </div>
      </section>
    </div>
  )
}