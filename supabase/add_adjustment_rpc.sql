-- Allows the client to create an inventory adjustment without ever inserting the generated `difference` column.
create or replace function public.create_stock_adjustment(
  p_product_id uuid,
  p_location_id uuid,
  p_counted_qty numeric
)
returns public.adjustments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recorded numeric;
  v_adjustment public.adjustments;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;
  if p_product_id is null or p_location_id is null then
    raise exception 'Product and location are required';
  end if;
  if p_counted_qty is null or p_counted_qty < 0 then
    raise exception 'Counted quantity cannot be negative';
  end if;

  select coalesce(sum(quantity), 0) into v_recorded
  from public.v_stock_balance
  where product_id = p_product_id and location_id = p_location_id;

  insert into public.adjustments (product_id, location_id, recorded_qty, counted_qty)
  values (p_product_id, p_location_id, v_recorded, p_counted_qty)
  returning * into v_adjustment;

  return v_adjustment;
end;
$$;

revoke all on function public.create_stock_adjustment(uuid, uuid, numeric) from public;
grant execute on function public.create_stock_adjustment(uuid, uuid, numeric) to authenticated;
