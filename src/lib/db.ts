import { supabase } from './supabase'
import type {
  Adjustment, Category, Delivery, DeliveryItemInput, LedgerEntry, Location, Product,
  Receipt, ReceiptItemInput, StockLevel, Transfer, Warehouse,
} from '../types'

const statusTitle = (value: string | null | undefined) => {
  const v = String(value || 'draft').toLowerCase()
  return v.charAt(0).toUpperCase() + v.slice(1) as Receipt['status']
}

export const api = {
  async categories() {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) throw error
    return (data || []) as Category[]
  },

  async warehouses() {
    const { data, error } = await supabase.from('warehouses').select('*').order('name')
    if (error) throw error
    const warehouses = (data || []) as Warehouse[]
    const { data: locations, error: locError } = await supabase.from('locations').select('*').order('created_at')
    if (locError) throw locError
    const locationRows = (locations || []) as Location[]
    return warehouses.map(w => ({
      ...w,
      location: locationRows.find(l => l.warehouse_id === w.id && l.is_default)?.name ?? null,
    }))
  },

  async locations() {
    const { data, error } = await supabase.from('locations').select('*').order('created_at')
    if (error) throw error
    return (data || []) as Location[]
  },

  async products() {
    const [{ data, error }, { data: categories, error: categoryError }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*'),
    ])
    if (error) throw error
    if (categoryError) throw categoryError
    const cats = (categories || []) as Category[]
    return ((data || []) as any[]).map(p => ({
      ...p,
      unit: p.unit_of_measure,
      reorder_level: Number(p.reorder_threshold ?? 0),
      category: cats.find(c => c.id === p.category_id) || null,
    })) as Product[]
  },

  async stock() {
    const [{ data: rows, error }, { data: products, error: productError }, { data: locations, error: locError }, { data: warehouses, error: whError }] = await Promise.all([
      supabase.from('v_stock_balance').select('*').order('quantity', { ascending: true }),
      supabase.from('products').select('*'),
      supabase.from('locations').select('*'),
      supabase.from('warehouses').select('*'),
    ])
    if (error) throw error
    if (productError) throw productError
    if (locError) throw locError
    if (whError) throw whError
    const ps = (products || []) as any[]
    const ls = (locations || []) as Location[]
    const ws = (warehouses || []) as Warehouse[]
    return ((rows || []) as any[]).map(r => {
      const loc = ls.find(l => l.id === r.location_id) || null
      return {
        ...r,
        quantity: Number(r.quantity ?? 0),
        location: loc,
        warehouse: ws.find(w => w.id === r.warehouse_id) || null,
        product: (() => {
          const p = ps.find(x => x.id === r.product_id)
          return p ? { ...p, unit: p.unit_of_measure, reorder_level: Number(p.reorder_threshold ?? 0) } : null
        })(),
      }
    }) as StockLevel[]
  },

  async receipts() {
    const [{ data, error }, { data: warehouses, error: whError }] = await Promise.all([
      supabase.from('receipts').select('*').order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*'),
    ])
    if (error) throw error
    if (whError) throw whError
    const ws = (warehouses || []) as Warehouse[]
    return ((data || []) as any[]).map(r => ({
      ...r,
      status: statusTitle(r.status),
      warehouse: ws.find(w => w.id === r.warehouse_id) || null,
    })) as Receipt[]
  },

  async deliveries() {
    const [{ data, error }, { data: warehouses, error: whError }] = await Promise.all([
      supabase.from('delivery_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*'),
    ])
    if (error) throw error
    if (whError) throw whError
    const ws = (warehouses || []) as Warehouse[]
    return ((data || []) as any[]).map(r => ({
      ...r,
      status: statusTitle(r.status),
      warehouse: ws.find(w => w.id === r.warehouse_id) || null,
    })) as Delivery[]
  },

  async transfers() {
    const [{ data, error }, { data: products, error: productError }, { data: locations, error: locError }, { data: warehouses, error: whError }] = await Promise.all([
      supabase.from('transfers').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('locations').select('*'),
      supabase.from('warehouses').select('*'),
    ])
    if (error) throw error
    if (productError) throw productError
    if (locError) throw locError
    if (whError) throw whError
    const ps = (products || []) as any[]
    const ls = (locations || []) as Location[]
    const ws = (warehouses || []) as Warehouse[]
    return ((data || []) as any[]).map(t => {
      const from = ls.find(l => l.id === t.from_location_id) || null
      const to = ls.find(l => l.id === t.to_location_id) || null
      return {
        ...t,
        status: statusTitle(t.status),
        product: ps.find(p => p.id === t.product_id) || null,
        from_location: from,
        to_location: to,
        from_warehouse: ws.find(w => w.id === from?.warehouse_id) || null,
        to_warehouse: ws.find(w => w.id === to?.warehouse_id) || null,
      }
    }) as Transfer[]
  },

  async adjustments() {
    const [{ data, error }, { data: products, error: productError }, { data: locations, error: locError }, { data: warehouses, error: whError }] = await Promise.all([
      supabase.from('adjustments').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('locations').select('*'),
      supabase.from('warehouses').select('*'),
    ])
    if (error) throw error
    if (productError) throw productError
    if (locError) throw locError
    if (whError) throw whError
    const ps = (products || []) as any[]
    const ls = (locations || []) as Location[]
    const ws = (warehouses || []) as Warehouse[]
    return ((data || []) as any[]).map(a => ({
      ...a,
      counted_quantity: Number(a.counted_qty ?? 0),
      previous_quantity: Number(a.recorded_qty ?? 0),
      difference: Number(a.difference ?? 0),
      product: ps.find(p => p.id === a.product_id) || null,
      location: ls.find(l => l.id === a.location_id) || null,
      warehouse: ws.find(w => w.id === ls.find(l => l.id === a.location_id)?.warehouse_id) || null,
    })) as Adjustment[]
  },

  async ledger() {
    const { data, error } = await supabase.from('v_stock_moves').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return ((data || []) as any[]).map(l => ({
      ...l,
      quantity: Number(l.quantity_change ?? 0),
      type: l.reason,
      warehouse: { id: l.warehouse_id, name: l.warehouse_name },
      location: { id: l.location_id, name: l.location_name, warehouse_id: l.warehouse_id, is_default: false, created_at: l.created_at },
      product: { id: l.product_id, name: l.product_name, sku: l.sku },
    })) as LedgerEntry[]
  },

  async createProduct(input: { name: string; sku: string; category_id?: string | null; unit?: string; reorder_level?: number; initial_stock?: number; location_id?: string | null }) {
    const name = input.name.trim()
    const sku = input.sku.trim()
    const unit = input.unit?.trim() || 'pcs'
    const reorder = Number(input.reorder_level ?? 0)
    const qty = Number(input.initial_stock ?? 0)
    if (!name || !sku) throw new Error('Product name and SKU are required.')
    if (!Number.isFinite(reorder) || reorder < 0) throw new Error('Reorder level must be a non-negative number.')
    if (!Number.isFinite(qty) || qty < 0) throw new Error('Initial stock must be a non-negative number.')
    if (qty > 0 && !input.location_id) throw new Error('A location is required for initial stock.')
    const payload = {
      name,
      sku,
      category_id: input.category_id || null,
      unit_of_measure: unit,
      reorder_threshold: reorder,
    }
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (error) throw error
    if (qty > 0) {
      const { error: ledgerError } = await supabase.from('stock_ledger').insert({
        product_id: data.id, location_id: input.location_id, quantity_change: qty, reason: 'initial_stock', reference_id: null,
      })
      if (ledgerError) {
        await supabase.from('products').delete().eq('id', data.id)
        throw ledgerError
      }
    }
    return data as Product
  },

  async updateProduct(id: string, input: Partial<{ name: string; sku: string; category_id: string | null; unit: string; reorder_level: number }>) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) { const name = input.name.trim(); if (!name) throw new Error('Product name is required.'); payload.name = name }
    if (input.sku !== undefined) { const sku = input.sku.trim(); if (!sku) throw new Error('SKU is required.'); payload.sku = sku }
    if (input.category_id !== undefined) payload.category_id = input.category_id || null
    if (input.unit !== undefined) { const unit = input.unit.trim(); if (!unit) throw new Error('Unit of measure is required.'); payload.unit_of_measure = unit }
    if (input.reorder_level !== undefined) { const reorder = Number(input.reorder_level); if (!Number.isFinite(reorder) || reorder < 0) throw new Error('Reorder level must be a non-negative number.'); payload.reorder_threshold = reorder }
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data as Product
  },

  async createCategory(name: string) {
    const cleanName = name.trim()
    if (!cleanName) throw new Error('Category name is required.')
    const { data, error } = await supabase.from('categories').insert({ name: cleanName }).select().single()
    if (error) throw error
    return data as Category
  },

  async createWarehouse(input: { name: string; location?: string }) {
    const name = input.name.trim()
    if (!name) throw new Error('Warehouse name is required.')
    const { data: warehouse, error } = await supabase.from('warehouses').insert({ name }).select().single()
    if (error) throw error
    if (input.location?.trim()) {
      const { error: locationError } = await supabase.from('locations').insert({
        warehouse_id: warehouse.id,
        name: input.location.trim(),
        is_default: true,
      })
      if (locationError) {
        await supabase.from('warehouses').delete().eq('id', warehouse.id)
        throw locationError
      }
    }
    return warehouse as Warehouse
  },

  async createReceipt(input: { supplier: string; warehouse_id: string; items: ReceiptItemInput[] }) {
    const supplier = input.supplier.trim()
    if (!supplier) throw new Error('Supplier is required.')
    if (!input.warehouse_id) throw new Error('Warehouse is required.')
    if (!input.items.length) throw new Error('Add at least one product line.')
    if (input.items.some(i => !i.product_id || !Number.isFinite(Number(i.quantity)) || Number(i.quantity) <= 0)) throw new Error('Every receipt line must have a product and a quantity greater than zero.')
    const { data: receipt, error } = await supabase.from('receipts').insert({
      supplier, warehouse_id: input.warehouse_id, status: 'ready',
    }).select().single()
    if (error) throw error
    const rows = input.items.map(i => ({
      receipt_id: receipt.id, product_id: i.product_id,
      quantity_expected: i.quantity, quantity_received: i.quantity,
    }))
    const { error: itemError } = await supabase.from('receipt_items').insert(rows)
    if (itemError) {
      await supabase.from('receipts').delete().eq('id', receipt.id)
      throw itemError
    }
    const { error: validationError } = await supabase.rpc('validate_receipt', { p_receipt_id: receipt.id })
    if (validationError) {
      await supabase.from('receipt_items').delete().eq('receipt_id', receipt.id)
      await supabase.from('receipts').delete().eq('id', receipt.id)
      throw validationError
    }
    return { ...receipt, status: 'Done' } as Receipt
  },

  async createDelivery(input: { customer: string; warehouse_id: string; items: DeliveryItemInput[] }) {
    const customer = input.customer.trim()
    if (!customer) throw new Error('Customer is required.')
    if (!input.warehouse_id) throw new Error('Warehouse is required.')
    if (!input.items.length) throw new Error('Add at least one product line.')
    if (input.items.some(i => !i.product_id || !Number.isFinite(Number(i.quantity)) || Number(i.quantity) <= 0)) throw new Error('Every delivery line must have a product and a quantity greater than zero.')
    const { data: delivery, error } = await supabase.from('delivery_orders').insert({
      customer, warehouse_id: input.warehouse_id, status: 'ready',
    }).select().single()
    if (error) throw error
    const rows = input.items.map(i => ({ delivery_id: delivery.id, product_id: i.product_id, quantity: i.quantity }))
    const { error: itemError } = await supabase.from('delivery_items').insert(rows)
    if (itemError) {
      await supabase.from('delivery_orders').delete().eq('id', delivery.id)
      throw itemError
    }
    const { error: validationError } = await supabase.rpc('validate_delivery', { p_delivery_id: delivery.id })
    if (validationError) {
      await supabase.from('delivery_items').delete().eq('delivery_id', delivery.id)
      await supabase.from('delivery_orders').delete().eq('id', delivery.id)
      throw validationError
    }
    return { ...delivery, status: 'Done' } as Delivery
  },

  async createTransfer(input: { product_id: string; from_location_id: string; to_location_id: string; quantity: number }) {
    if (!input.product_id || !input.from_location_id || !input.to_location_id) throw new Error('Product, source location and destination location are required.')
    if (input.from_location_id === input.to_location_id) throw new Error('Source and destination locations must be different.')
    if (!Number.isFinite(Number(input.quantity)) || input.quantity <= 0) throw new Error('Quantity must be greater than zero.')
    const { data: transfer, error } = await supabase.from('transfers').insert({
      product_id: input.product_id,
      from_location_id: input.from_location_id,
      to_location_id: input.to_location_id,
      quantity: input.quantity,
      status: 'ready',
    }).select().single()
    if (error) throw error
    const { error: validationError } = await supabase.rpc('validate_transfer', { p_transfer_id: transfer.id })
    if (validationError) {
      await supabase.from('transfers').delete().eq('id', transfer.id)
      throw validationError
    }
    return { ...transfer, status: 'Done' } as Transfer
  },

  async createAdjustment(input: { product_id: string; location_id: string; counted_quantity: number }) {
    if (!input.product_id || !input.location_id) throw new Error('Product and location are required.')
    const counted = Number(input.counted_quantity)
    if (!Number.isFinite(counted) || counted < 0) throw new Error('Counted quantity cannot be negative.')

   // `difference` is a generated PostgreSQL column. The dedicated RPC only
   // accepts the two source quantities and lets PostgreSQL calculate the diff.
    const { data: adjustment, error } = await supabase.rpc('create_stock_adjustment', {
      p_product_id: input.product_id,
      p_location_id: input.location_id,
      p_counted_qty: counted,
    })
    if (error) throw new Error(error.message || 'Could not create the stock adjustment.')
    if (!adjustment) throw new Error('The adjustment was not created.')
    return adjustment as Adjustment
  },
}
