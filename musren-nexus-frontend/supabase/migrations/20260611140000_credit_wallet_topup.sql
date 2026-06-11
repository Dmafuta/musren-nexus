-- RPC called by the backend after a successful M-Pesa STK Push confirmation.
-- Credits the customer's cash wallet and writes a ledger entry.
-- Callable only by service_role (backend) — not by browser clients.

CREATE OR REPLACE FUNCTION public.credit_wallet_topup(
  _user_id      uuid,
  _amount_cents integer,
  _mpesa_receipt text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be positive';
  END IF;

  -- Upsert wallet: create row if first top-up, otherwise add to balance
  INSERT INTO public.affiliate_wallets (user_id, balance_cash_cents)
  VALUES (_user_id, _amount_cents)
  ON CONFLICT (user_id) DO UPDATE
    SET balance_cash_cents = affiliate_wallets.balance_cash_cents + _amount_cents,
        updated_at = now();

  -- Ledger entry
  INSERT INTO public.wallet_ledger (user_id, kind, points_delta, cash_delta_cents, note)
  VALUES (
    _user_id,
    'earn',
    0,
    _amount_cents,
    'M-Pesa top-up' || COALESCE(' • ' || _mpesa_receipt, '')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_wallet_topup(uuid, integer, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.credit_wallet_topup(uuid, integer, text) TO service_role;
