create or replace function convert_quote_to_invoice(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote quotes%rowtype;
  v_invoice_id uuid;
  v_invoice_number text;
begin
  select * into v_quote from quotes where id = p_quote_id and firm_id = auth_firm_id();
  if not found then
    raise exception 'Quote not found or not in your firm';
  end if;
  if not auth_is_staff() then
    raise exception 'Not authorized';
  end if;
  if v_quote.status <> 'accepted' then
    raise exception 'Only accepted quotes can be converted to an invoice';
  end if;

  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_quote.id::text, 1, 6);

  insert into invoices (firm_id, invoice_number, client_id, matter_id, quote_id, status, currency, notes)
  values (v_quote.firm_id, v_invoice_number, v_quote.client_id, v_quote.matter_id, v_quote.id, 'draft', v_quote.currency, v_quote.notes)
  returning id into v_invoice_id;

  insert into invoice_items (invoice_id, description, quantity, unit_price, tax_rate, discount, sort_order)
  select v_invoice_id, description, quantity, unit_price, tax_rate, discount, sort_order
  from quote_items where quote_id = v_quote.id;
  -- line_total/invoice totals recompute automatically via
  -- trg_invoice_item_line_total / trg_recalc_invoice_totals (0005_billing_triggers.sql)

  insert into activities (firm_id, user_id, action, entity_type, entity_id, metadata)
  values (v_quote.firm_id, auth.uid(), 'invoice.created', 'invoice', v_invoice_id,
          jsonb_build_object('from_quote_id', v_quote.id, 'invoice_number', v_invoice_number));

  return v_invoice_id;
end;
$$;
