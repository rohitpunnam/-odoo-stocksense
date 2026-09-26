-- StockSense sample dataset for the existing Supabase schema.
-- Safe to re-run for the StockSense sample dataset; cleanup targets only its sample identifiers.
-- Run in Supabase SQL Editor while using the existing StockSense project.

BEGIN;

-- Remove a previous StockSense sample dataset without touching normal/user data.
DELETE FROM public.receipt_items WHERE receipt_id IN (SELECT id FROM public.receipts WHERE supplier IN ('Alpha Industrial Supplies','Beta Components Ltd','Gamma Office Systems','Delta Manufacturing'));
DELETE FROM public.delivery_items WHERE delivery_id IN (SELECT id FROM public.delivery_orders WHERE customer IN ('Orion Manufacturing','Brightline Retail','Vertex Industries','Northstar Projects','Metro Office Group','Apex Fabrication','BluePeak Services','Crescent Retail'));
DELETE FROM public.stock_ledger WHERE product_id IN (SELECT id FROM public.products WHERE sku ~ '^SS-[0-9]{3}$');
DELETE FROM public.adjustments WHERE product_id IN (SELECT id FROM public.products WHERE sku ~ '^SS-[0-9]{3}$');
DELETE FROM public.transfers WHERE product_id IN (SELECT id FROM public.products WHERE sku ~ '^SS-[0-9]{3}$');
DELETE FROM public.receipts WHERE supplier IN ('Alpha Industrial Supplies','Beta Components Ltd','Gamma Office Systems','Delta Manufacturing');
DELETE FROM public.delivery_orders WHERE customer IN ('Orion Manufacturing','Brightline Retail','Vertex Industries','Northstar Projects','Metro Office Group','Apex Fabrication','BluePeak Services','Crescent Retail');
DELETE FROM public.products WHERE sku ~ '^SS-[0-9]{3}$';
DELETE FROM public.locations WHERE name IN ('Central Main','Central Rack A','Central Rack B','North Main','North Rack A','North Rack B','South Main','South Rack A','South Rack B','Production Floor','Assembly','Finished Goods');
DELETE FROM public.warehouses WHERE name IN ('Central Warehouse','North Warehouse','South Warehouse','Production Hub');
DELETE FROM public.categories WHERE name IN ('Electronics','Office Supplies','Components','Packaging','Safety & Tools','Finished Goods');

DO $$
DECLARE
  r record;
  v_cat uuid;
  v_wh uuid;
  v_loc uuid;
  v_loc2 uuid;
  v_loc3 uuid;
  v_product uuid;
  v_receipt uuid;
  v_delivery uuid;
  v_transfer uuid;
  v_balance numeric;
  v_delta numeric;
BEGIN
  -- Categories
  FOR r IN SELECT * FROM (VALUES
    ('Electronics'),('Office Supplies'),('Components'),
    ('Packaging'),('Safety & Tools'),('Finished Goods')
  ) AS x(name)
  LOOP
    INSERT INTO public.categories(name) VALUES (r.name) RETURNING id INTO v_cat;
  END LOOP;

  -- Warehouses + locations
  FOR r IN SELECT * FROM (VALUES
    ('Central Warehouse','Central Main','Central Rack A','Central Rack B'),
    ('North Warehouse','North Main','North Rack A','North Rack B'),
    ('South Warehouse','South Main','South Rack A','South Rack B'),
    ('Production Hub','Production Floor','Assembly','Finished Goods')
  ) AS x(warehouse_name, loc1, loc2, loc3)
  LOOP
    INSERT INTO public.warehouses(name) VALUES (r.warehouse_name) RETURNING id INTO v_wh;
    INSERT INTO public.locations(warehouse_id,name,is_default) VALUES (v_wh,r.loc1,true) RETURNING id INTO v_loc;
    INSERT INTO public.locations(warehouse_id,name,is_default) VALUES (v_wh,r.loc2,false) RETURNING id INTO v_loc2;
    INSERT INTO public.locations(warehouse_id,name,is_default) VALUES (v_wh,r.loc3,false) RETURNING id INTO v_loc3;
  END LOOP;

  -- Products with opening stock in their warehouse's default location.
  FOR r IN SELECT * FROM (VALUES
    ('SS-001','Wireless Barcode Scanner','pcs',35),
    ('SS-002','Thermal Label Printer','pcs',12),
    ('SS-003','USB-C Docking Station','pcs',18),
    ('SS-004','Safety Helmet','pcs',28),
    ('SS-005','Nitrile Gloves Box','box',60),
    ('SS-006','Steel Fasteners','kg',120),
    ('SS-007','Aluminium Sheet','sheet',75),
    ('SS-008','Packing Tape','roll',90),
    ('SS-009','Corrugated Box Medium','box',140),
    ('SS-010','Wooden Chair','pcs',45),
    ('SS-011','Office Desk','pcs',22),
    ('SS-012','LED Work Light','pcs',16),
    ('SS-013','Network Switch 24-Port','pcs',9),
    ('SS-014','Ethernet Cable Cat6','pcs',110),
    ('SS-015','Steel Rod','kg',95),
    ('SS-016','Storage Bin Large','pcs',32),
    ('SS-017','Hand Trolley','pcs',7),
    ('SS-018','Industrial Drill','pcs',11),
    ('SS-019','Pallet Wrap','roll',48),
    ('SS-020','Finished Frame Assembly','pcs',26)
  ) AS x(sku,name,unit,opening_qty)
  LOOP
    SELECT id INTO v_cat
    FROM public.categories
    WHERE name = CASE
      WHEN r.sku IN ('SS-001','SS-002','SS-003','SS-013') THEN 'Electronics'
      WHEN r.sku IN ('SS-004','SS-005','SS-018') THEN 'Safety & Tools'
      WHEN r.sku IN ('SS-006','SS-007','SS-015') THEN 'Components'
      WHEN r.sku IN ('SS-008','SS-009','SS-019') THEN 'Packaging'
      WHEN r.sku IN ('SS-010','SS-011','SS-014','SS-016','SS-017') THEN 'Office Supplies'
      ELSE 'Finished Goods'
    END
    LIMIT 1;

    SELECT id INTO v_wh
    FROM public.warehouses
    WHERE name = CASE
      WHEN mod((replace(r.sku,'SS-',''))::int,4)=1 THEN 'Central Warehouse'
      WHEN mod((replace(r.sku,'SS-',''))::int,4)=2 THEN 'North Warehouse'
      WHEN mod((replace(r.sku,'SS-',''))::int,4)=3 THEN 'South Warehouse'
      ELSE 'Production Hub'
    END
    LIMIT 1;

    SELECT id INTO v_loc FROM public.locations WHERE warehouse_id=v_wh AND is_default=true LIMIT 1;

    INSERT INTO public.products(name,sku,category_id,unit_of_measure,reorder_threshold,created_at)
    VALUES (
      r.name,r.sku,v_cat,r.unit,
      CASE WHEN r.opening_qty <= 12 THEN 12 WHEN r.opening_qty <= 30 THEN 15 ELSE 20 END,
      now() - make_interval(days => ((replace(r.sku,'SS-',''))::int % 45))
    ) RETURNING id INTO v_product;

    INSERT INTO public.stock_ledger(product_id,location_id,quantity_change,reason,reference_id,created_at)
    VALUES (v_product,v_loc,r.opening_qty,'initial_stock',NULL,now()-interval '35 days');
  END LOOP;

  -- Completed receipts: incoming stock that appears in the ledger.
  FOR r IN SELECT * FROM (VALUES
    ('Alpha Industrial Supplies','SS-001',22),('Beta Components Ltd','SS-002',8),
    ('Gamma Office Systems','SS-003',10),('Alpha Industrial Supplies','SS-006',40),
    ('Beta Components Ltd','SS-008',30),('Delta Manufacturing','SS-009',60),
    ('Alpha Industrial Supplies','SS-015',45),('Gamma Office Systems','SS-020',15)
  ) AS x(supplier,sku,qty)
  LOOP
    SELECT id INTO v_product FROM public.products WHERE sku=r.sku;
    SELECT w.id INTO v_wh
    FROM public.products p
    JOIN public.stock_ledger sl ON sl.product_id=p.id
    JOIN public.locations l ON l.id=sl.location_id
    JOIN public.warehouses w ON w.id=l.warehouse_id
    WHERE p.id=v_product LIMIT 1;
    INSERT INTO public.receipts(supplier,warehouse_id,status,created_at)
    VALUES(r.supplier,v_wh,'done',now()-make_interval(days => 20 + (length(r.sku))));
    SELECT id INTO v_receipt FROM public.receipts WHERE supplier=r.supplier AND warehouse_id=v_wh ORDER BY created_at DESC LIMIT 1;
    INSERT INTO public.receipt_items(receipt_id,product_id,quantity_expected,quantity_received)
    VALUES(v_receipt,v_product,r.qty,r.qty);
    SELECT id INTO v_loc FROM public.locations WHERE warehouse_id=v_wh AND is_default=true LIMIT 1;
    INSERT INTO public.stock_ledger(product_id,location_id,quantity_change,reason,reference_id,created_at)
    VALUES(v_product,v_loc,r.qty,'receipt',v_receipt,now()-make_interval(days => 20 + (length(r.sku))));
  END LOOP;

  -- Ready receipts for dashboard attention.
  FOR r IN SELECT * FROM (VALUES
    ('Delta Manufacturing','SS-004',16),('Alpha Industrial Supplies','SS-010',12),
    ('Beta Components Ltd','SS-013',10),('Gamma Office Systems','SS-018',8)
  ) AS x(supplier,sku,qty)
  LOOP
    SELECT id INTO v_product FROM public.products WHERE sku=r.sku;
    SELECT l.warehouse_id INTO v_wh FROM public.locations l JOIN public.stock_ledger sl ON sl.location_id=l.id WHERE sl.product_id=v_product LIMIT 1;
    INSERT INTO public.receipts(supplier,warehouse_id,status,created_at)
    VALUES(r.supplier,v_wh,'ready',now()-make_interval(days => 2 + length(r.sku)));
    SELECT id INTO v_receipt FROM public.receipts WHERE supplier=r.supplier AND warehouse_id=v_wh ORDER BY created_at DESC LIMIT 1;
    INSERT INTO public.receipt_items(receipt_id,product_id,quantity_expected,quantity_received)
    VALUES(v_receipt,v_product,r.qty,r.qty);
  END LOOP;

  -- Completed deliveries with corresponding ledger decreases.
  FOR r IN SELECT * FROM (VALUES
    ('Orion Manufacturing','SS-001',10),('Brightline Retail','SS-003',6),
    ('Vertex Industries','SS-006',25),('Orion Manufacturing','SS-008',20),
    ('Northstar Projects','SS-009',45),('Brightline Retail','SS-011',8),
    ('Vertex Industries','SS-015',22),('Orion Manufacturing','SS-020',7)
  ) AS x(customer,sku,qty)
  LOOP
    SELECT id INTO v_product FROM public.products WHERE sku=r.sku;
    SELECT l.warehouse_id INTO v_wh FROM public.locations l JOIN public.stock_ledger sl ON sl.location_id=l.id WHERE sl.product_id=v_product LIMIT 1;
    SELECT id INTO v_loc FROM public.locations WHERE warehouse_id=v_wh AND is_default=true LIMIT 1;
    SELECT COALESCE(sum(quantity_change),0) INTO v_balance FROM public.stock_ledger WHERE product_id=v_product AND location_id=v_loc;
    IF v_balance > r.qty THEN
      INSERT INTO public.delivery_orders(customer,warehouse_id,status,created_at)
      VALUES(r.customer,v_wh,'done',now()-make_interval(days => 15 + length(r.sku)));
      SELECT id INTO v_delivery FROM public.delivery_orders WHERE customer=r.customer AND warehouse_id=v_wh ORDER BY created_at DESC LIMIT 1;
      INSERT INTO public.delivery_items(delivery_id,product_id,quantity) VALUES(v_delivery,v_product,r.qty);
      INSERT INTO public.stock_ledger(product_id,location_id,quantity_change,reason,reference_id,created_at)
      VALUES(v_product,v_loc,-r.qty,'delivery',v_delivery,now()-make_interval(days => 15 + length(r.sku)));
    END IF;
  END LOOP;

  -- Ready deliveries.
  FOR r IN SELECT * FROM (VALUES
    ('Metro Office Group','SS-002',3),('Apex Fabrication','SS-005',10),
    ('BluePeak Services','SS-012',4),('Crescent Retail','SS-017',2)
  ) AS x(customer,sku,qty)
  LOOP
    SELECT id INTO v_product FROM public.products WHERE sku=r.sku;
    SELECT l.warehouse_id INTO v_wh FROM public.locations l JOIN public.stock_ledger sl ON sl.location_id=l.id WHERE sl.product_id=v_product LIMIT 1;
    INSERT INTO public.delivery_orders(customer,warehouse_id,status,created_at)
    VALUES(r.customer,v_wh,'ready',now()-make_interval(days => 1 + length(r.sku)));
    SELECT id INTO v_delivery FROM public.delivery_orders WHERE customer=r.customer AND warehouse_id=v_wh ORDER BY created_at DESC LIMIT 1;
    INSERT INTO public.delivery_items(delivery_id,product_id,quantity) VALUES(v_delivery,v_product,r.qty);
  END LOOP;

  -- Completed transfers between racks / warehouses.
  FOR r IN SELECT * FROM (VALUES
    ('SS-001','Central Rack A','Central Rack B',5),
    ('SS-003','North Rack A','North Rack B',4),
    ('SS-006','South Rack A','South Rack B',20),
    ('SS-008','Central Rack A','North Rack A',10),
    ('SS-009','North Rack B','South Rack B',20),
    ('SS-015','South Rack A','Production Floor',15),
    ('SS-020','Production Floor','Finished Goods',8)
  ) AS x(sku,from_name,to_name,qty)
  LOOP
    SELECT id INTO v_product FROM public.products WHERE sku=r.sku;
    SELECT id INTO v_loc FROM public.locations WHERE name=r.from_name LIMIT 1;
    SELECT id INTO v_loc2 FROM public.locations WHERE name=r.to_name LIMIT 1;
    -- Seed source stock in the rack if needed, then move it.
    SELECT COALESCE(sum(quantity_change),0) INTO v_balance FROM public.stock_ledger WHERE product_id=v_product AND location_id=v_loc;
    IF v_balance < r.qty THEN
      INSERT INTO public.stock_ledger(product_id,location_id,quantity_change,reason,reference_id,created_at)
      VALUES(v_product,v_loc,r.qty+5,'initial_stock',NULL,now()-interval '18 days');
    END IF;
    INSERT INTO public.transfers(product_id,from_location_id,to_location_id,quantity,status,created_at)
    VALUES(v_product,v_loc,v_loc2,r.qty,'done',now()-interval '9 days');
    SELECT id INTO v_transfer FROM public.transfers WHERE product_id=v_product AND from_location_id=v_loc AND to_location_id=v_loc2 ORDER BY created_at DESC LIMIT 1;
    INSERT INTO public.stock_ledger(product_id,location_id,quantity_change,reason,reference_id,created_at)
    VALUES(v_product,v_loc,-r.qty,'transfer_out',v_transfer,now()-interval '9 days'),
          (v_product,v_loc2,r.qty,'transfer_in',v_transfer,now()-interval '9 days');
  END LOOP;

  -- Ready transfers to populate the scheduled-work view.
  FOR r IN SELECT * FROM (VALUES
    ('SS-010','Central Main','Central Rack A',6),
    ('SS-014','North Main','North Rack B',15),
    ('SS-016','Production Floor','Finished Goods',5)
  ) AS x(sku,from_name,to_name,qty)
  LOOP
    SELECT id INTO v_product FROM public.products WHERE sku=r.sku;
    SELECT id INTO v_loc FROM public.locations WHERE name=r.from_name LIMIT 1;
    SELECT id INTO v_loc2 FROM public.locations WHERE name=r.to_name LIMIT 1;
    INSERT INTO public.transfers(product_id,from_location_id,to_location_id,quantity,status,created_at)
    VALUES(v_product,v_loc,v_loc2,r.qty,'ready',now()-interval '1 day');
  END LOOP;

  -- Adjustments: calculated against current stock so the generated difference is valid and is logged by the trigger.
  FOR r IN SELECT * FROM (VALUES
    ('SS-004','North Main',-3),('SS-005','North Main',4),
    ('SS-007','South Main',-5),('SS-012','South Main',2),
    ('SS-013','South Main',-1),('SS-018','Production Floor',-2),
    ('SS-019','Production Floor',3),('SS-020','Finished Goods',-1)
  ) AS x(sku,loc_name,delta)
  LOOP
    SELECT id INTO v_product FROM public.products WHERE sku=r.sku;
    SELECT id INTO v_loc FROM public.locations WHERE name=r.loc_name LIMIT 1;
    SELECT COALESCE(sum(quantity_change),0) INTO v_balance FROM public.stock_ledger WHERE product_id=v_product AND location_id=v_loc;
    v_delta := r.delta;
    INSERT INTO public.adjustments(product_id,location_id,recorded_qty,counted_qty,created_at)
    VALUES(v_product,v_loc,v_balance,GREATEST(0,v_balance+v_delta),now()-interval '3 days');
  END LOOP;

  -- One explicit out-of-stock sample item for the dashboard alert center.
  SELECT id INTO v_product FROM public.products WHERE sku='SS-017';
  SELECT id INTO v_loc FROM public.locations WHERE name='Central Main' LIMIT 1;
  SELECT COALESCE(sum(quantity_change),0) INTO v_balance FROM public.stock_ledger WHERE product_id=v_product AND location_id=v_loc;
  IF v_balance > 0 THEN
    INSERT INTO public.adjustments(product_id,location_id,recorded_qty,counted_qty,created_at)
    VALUES(v_product,v_loc,v_balance,0,now()-interval '1 day');
  END IF;
END $$;

COMMIT;

-- Quick verification summary
SELECT 'categories' AS entity, count(*)::int AS sample_count FROM public.categories WHERE name IN ('Electronics','Office Supplies','Components','Packaging','Safety & Tools','Finished Goods')
UNION ALL SELECT 'warehouses', count(*)::int FROM public.warehouses WHERE name IN ('Central Warehouse','North Warehouse','South Warehouse','Production Hub')
UNION ALL SELECT 'locations', count(*)::int FROM public.locations WHERE name IN ('Central Main','Central Rack A','Central Rack B','North Main','North Rack A','North Rack B','South Main','South Rack A','South Rack B','Production Floor','Assembly','Finished Goods')
UNION ALL SELECT 'products', count(*)::int FROM public.products WHERE sku ~ '^SS-[0-9]{3}$'
UNION ALL SELECT 'receipts', count(*)::int FROM public.receipts WHERE supplier IN ('Alpha Industrial Supplies','Beta Components Ltd','Gamma Office Systems','Delta Manufacturing')
UNION ALL SELECT 'delivery_orders', count(*)::int FROM public.delivery_orders WHERE customer IN ('Orion Manufacturing','Brightline Retail','Vertex Industries','Northstar Projects','Metro Office Group','Apex Fabrication','BluePeak Services','Crescent Retail')
UNION ALL SELECT 'transfers', count(*)::int FROM public.transfers t JOIN public.products p ON p.id=t.product_id WHERE p.sku ~ '^SS-[0-9]{3}$'
UNION ALL SELECT 'adjustments', count(*)::int FROM public.adjustments a JOIN public.products p ON p.id=a.product_id WHERE p.sku ~ '^SS-[0-9]{3}$'
UNION ALL SELECT 'ledger_entries', count(*)::int FROM public.stock_ledger sl JOIN public.products p ON p.id=sl.product_id WHERE p.sku ~ '^SS-[0-9]{3}$';
