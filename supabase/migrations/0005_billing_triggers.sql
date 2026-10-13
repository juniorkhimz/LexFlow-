-- Quote and invoice totals are recomputed from their line items by triggers
-- below, not trusted from whatever the client sends. The client may still
-- send a `total`/`subtotal` field on insert (e.g. optimistic UI), but these
-- triggers overwrite it right after, from quote_items/invoice_items, which
-- themselves compute line_total server-side too.

create or replace function set_line_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total := round(
    (new.quantity * new.unit_price) * (1 + new.tax_rate / 100.0) - new.discount,
    2
  );
  return new;
end;
$$;

create trigger trg_quote_item_line_total
  before insert or update on quote_items
  for each row execute function set_line_total();

create trigger trg_invoice_item_line_total
  before insert or update on invoice_items
  for each row execute function set_line_total();

create or replace function recalc_quote_totals()
returns trigger
language plpgsql
as $$
declare
  v_quote_id uuid := coalesce(new.quote_id, old.quote_id);
  v_subtotal numeric(14,2);
  v_tax numeric(14,2);
  v_discount numeric(14,2);
begin
  select
    coalesce(sum(quantity * unit_price), 0),
    coalesce(sum(quantity * unit_price * tax_rate / 100.0), 0),
    coalesce(sum(discount), 0)
  into v_subtotal, v_tax, v_discount
  from quote_items where quote_id = v_quote_id;

  update quotes
  set subtotal = v_subtotal,
      tax_amount = v_tax,
      discount_amount = v_discount,
      total = v_subtotal + v_tax - v_discount
  where id = v_quote_id;

  return null;
end;
$$;

create trigger trg_recalc_quote_totals
  after insert or update or delete on quote_items
  for each row execute function recalc_quote_totals();

create or replace function recalc_invoice_totals()
returns trigger
language plpgsql
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_subtotal numeric(14,2);
  v_tax numeric(14,2);
  v_discount numeric(14,2);
begin
  select
    coalesce(sum(quantity * unit_price), 0),
    coalesce(sum(quantity * unit_price * tax_rate / 100.0), 0),
    coalesce(sum(discount), 0)
  into v_subtotal, v_tax, v_discount
  from invoice_items where invoice_id = v_invoice_id;

  update invoices
  set subtotal = v_subtotal,
      tax_amount = v_tax,
      discount_amount = v_discount,
      total = v_subtotal + v_tax - v_discount
  where id = v_invoice_id;

  return null;
end;
$$;

create trigger trg_recalc_invoice_totals
  after insert or update or delete on invoice_items
  for each row execute function recalc_invoice_totals();

-- Keep invoices.amount_paid and status in sync with recorded payments —
-- another figure that must never be trusted from the client directly.
create or replace function recalc_invoice_payment_status()
returns trigger
language plpgsql
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid numeric(14,2);
  v_total numeric(14,2);
  v_due_date date;
begin
  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = v_invoice_id;
  select total, due_date into v_total, v_due_date from invoices where id = v_invoice_id;

  update invoices
  set amount_paid = v_paid,
      status = case
        when v_paid >= v_total and v_total > 0 then 'paid'
        when v_paid > 0 and v_paid < v_total then 'partially_paid'
        when v_due_date is not null and v_due_date < current_date and v_paid < v_total then 'overdue'
        else status
      end
  where id = v_invoice_id;

  return null;
end;
$$;

create trigger trg_recalc_invoice_payment_status
  after insert or update or delete on payments
  for each row execute function recalc_invoice_payment_status();
