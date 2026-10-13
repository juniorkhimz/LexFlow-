-- Closes a billing-integrity gap: quote_items/invoice_items had no
-- constraint stopping negative quantity, unit_price, tax_rate, or discount.
-- The totals are already computed server-side by triggers
-- (0005_billing_triggers.sql), which is the main protection — but without
-- these, a client with a valid staff session could still insert a line
-- item with e.g. a negative unit_price or a discount larger than the
-- subtotal, silently shrinking an invoice's total. Payments already had
-- `check (amount > 0)`; this brings line items to the same standard.

alter table quote_items
  add constraint quote_items_quantity_nonnegative check (quantity >= 0),
  add constraint quote_items_unit_price_nonnegative check (unit_price >= 0),
  add constraint quote_items_tax_rate_range check (tax_rate >= 0 and tax_rate <= 100),
  add constraint quote_items_discount_nonnegative check (discount >= 0);

alter table invoice_items
  add constraint invoice_items_quantity_nonnegative check (quantity >= 0),
  add constraint invoice_items_unit_price_nonnegative check (unit_price >= 0),
  add constraint invoice_items_tax_rate_range check (tax_rate >= 0 and tax_rate <= 100),
  add constraint invoice_items_discount_nonnegative check (discount >= 0);

-- Also close the equivalent gap on quotes/invoices header-level discount,
-- and on leads.estimated_value, which had no floor either.
alter table quotes
  add constraint quotes_discount_amount_nonnegative check (discount_amount >= 0);

alter table invoices
  add constraint invoices_discount_amount_nonnegative check (discount_amount >= 0);

alter table leads
  add constraint leads_estimated_value_nonnegative check (estimated_value is null or estimated_value >= 0);
