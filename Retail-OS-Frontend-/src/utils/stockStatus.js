/**
 * Shared Stock Status Logic
 *
 * Rules:
 * - Out of Stock: Available Quantity <= 0
 * - Low Stock: Available Quantity > 0 AND Available Quantity < Minimum Stock Threshold
 * - At Reorder: Available Quantity == Minimum Stock Threshold
 * - In Stock: Available Quantity > Minimum Stock Threshold
 *
 * Price / Valuation does NOT determine stock status.
 */

export const getItemStock = (item) => {
    if (!item || typeof item !== "object") {
        const num = Number(item);
        return Number.isFinite(num) ? num : 0;
    }

    const candidates = [
        item.quantity,
        item.stock,
        item.available_stock,
        item.available_quantity,
        item.availableQuantity,
        item.current_stock,
        item.currentStock,
        item.qty,
    ];

    for (const val of candidates) {
        if (val !== undefined && val !== null && val !== "") {
            const num = Number(val);
            if (Number.isFinite(num)) {
                return num;
            }
        }
    }

    return 0;
};

export const getItemMinStock = (item) => {
    if (!item || typeof item !== "object") {
        const num = Number(item);
        return Number.isFinite(num) && num > 0 ? num : 0;
    }

    const candidates = [
        item.low_stock_threshold,
        item.minimum_stock,
        item.min_stock,
        item.minStock,
        item.reorder_level,
        item.reorderLevel,
        item.reorder_point,
        item.reorderPoint,
        item.min_stock_level,
        item.threshold,
        item.alert_threshold,
        item.product?.low_stock_threshold,
        item.product?.minimum_stock,
        item.product?.min_stock,
        item.product?.minStock,
        item.product?.reorder_level,
        item.product?.reorderLevel,
        item.product?.reorder_point,
        item.product_details?.low_stock_threshold,
        item.product_details?.minimum_stock,
        item.product_details?.min_stock,
        item.product_details?.minStock,
        item.product_details?.reorder_level,
        item.product_details?.reorderLevel,
        item.product_details?.reorder_point,
    ];

    for (const val of candidates) {
        if (val !== undefined && val !== null && val !== "") {
            const num = Number(val);
            if (Number.isFinite(num) && num > 0) {
                return num;
            }
        }
    }

    return 0;
};

export const calculateStockStatus = (stockOrItem, maybeMinStock) => {
    let stock = 0;
    let minStock = 0;

    if (stockOrItem !== null && typeof stockOrItem === "object") {
        stock = getItemStock(stockOrItem);
        minStock =
            maybeMinStock !== undefined && maybeMinStock !== null
                ? Number(maybeMinStock) || 0
                : getItemMinStock(stockOrItem);
    } else {
        stock = Number(stockOrItem) || 0;
        minStock = Number(maybeMinStock) || 0;
    }

    // 1. Available Quantity <= 0 -> Out of Stock
    if (stock <= 0) {
        return {
            label: "Out of Stock",
            status: "Out of Stock",
            color: "#dc2626",
            bg: "#fef2f2",
            border: "#fecaca",
            badgeClass: "out-of-stock-badge",
        };
    }

    // 2. Available Quantity > 0 AND Available Quantity < Minimum Stock Threshold -> Low Stock
    if (minStock > 0 && stock < minStock) {
        return {
            label: "Low Stock",
            status: "Low Stock",
            color: "#d97706",
            bg: "#fffbeb",
            border: "#fde68a",
            badgeClass: "low-stock-badge",
        };
    }

    // 3. Available Quantity == Minimum Stock Threshold -> At Reorder
    if (minStock > 0 && stock === minStock) {
        return {
            label: "At Reorder",
            status: "At Reorder",
            color: "#2563eb",
            bg: "#eff6ff",
            border: "#bfdbfe",
            badgeClass: "at-reorder-badge",
        };
    }

    // 4. Available Quantity > Minimum Stock Threshold (or minStock is not set / 0) -> In Stock
    return {
        label: "In Stock",
        status: "In Stock",
        color: "#059669",
        bg: "#ecfdf5",
        border: "#a7f3d0",
        badgeClass: "in-stock-badge",
    };
};

export const isOutOfStock = (item) => calculateStockStatus(item).label === "Out of Stock";
export const isLowStock = (item) => calculateStockStatus(item).label === "Low Stock";
export const isAtReorder = (item) => calculateStockStatus(item).label === "At Reorder";
export const isInStock = (item) => calculateStockStatus(item).label === "In Stock";

export default calculateStockStatus;

