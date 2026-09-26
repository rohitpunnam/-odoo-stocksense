export type ID = string

export interface Category { id: ID; name: string }

export interface Warehouse {
  id: ID
  name: string
  location?: string | null
}

export interface Location {
  id: ID
  warehouse_id: ID
  name: string
  created_at: string
  is_default: boolean
}

export interface Product {
  id: ID
  name: string
  sku: string
  category_id?: ID | null
  unit?: string | null
  reorder_level?: number | null
  category?: Category | null
}

export interface StockLevel {
  product_id: ID
  location_id: ID
  warehouse_id: ID
  quantity: number
  location?: Location | null
  warehouse?: Warehouse | null
  product?: Product | null
}

export type DocStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled'

export interface Receipt {
  id: ID
  reference_no?: string | null
  supplier: string
  warehouse_id: ID
  status: DocStatus
  created_at: string
  warehouse?: Warehouse | null
}

export interface Delivery {
  id: ID
  reference_no?: string | null
  customer: string
  warehouse_id: ID
  status: DocStatus
  created_at: string
  warehouse?: Warehouse | null
}

export interface Transfer {
  id: ID
  reference_no?: string | null
  product_id: ID
  from_location_id: ID
  to_location_id: ID
  quantity: number
  status: DocStatus
  created_at: string
  product?: Product | null
  from_location?: Location | null
  to_location?: Location | null
  from_warehouse?: Warehouse | null
  to_warehouse?: Warehouse | null
}

export interface Adjustment {
  id: ID
  reference_no?: string | null
  product_id: ID
  location_id: ID
  counted_quantity: number
  previous_quantity: number
  difference: number
  created_at: string
  product?: Product | null
  location?: Location | null
  warehouse?: Warehouse | null
}

export interface LedgerEntry {
  id: ID
  product_id: ID
  location_id: ID
  quantity: number
  type: string
  reference_id?: ID | null
  reference_no?: string | null
  created_at: string
  product?: Product | null
  location?: Location | null
  warehouse?: Warehouse | null
}

export interface Profile {
  id: ID
  full_name?: string | null
  role?: 'inventory_manager' | 'warehouse_staff' | null
}

export interface ReceiptItemInput { product_id: ID; quantity: number }
export interface DeliveryItemInput { product_id: ID; quantity: number }
