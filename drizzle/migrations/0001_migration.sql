CREATE UNIQUE INDEX payments_order_uniq ON public.payments (provider_order_id);
CREATE OR REPLACE FUNCTION public.grant_purchase(_order text, _payment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payments;
BEGIN
  SELECT * INTO p FROM payments WHERE provider_order_id = _order FOR UPDATE;
  IF NOT FOUND OR p.status = 'paid' THEN RETURN; END IF;
  UPDATE payments SET status='paid', provider_payment_id=_payment WHERE id=p.id;
  INSERT INTO entitlements(user_id) VALUES (p.user_id) ON CONFLICT DO NOTHING;
  IF p.product = 'image_pack' THEN UPDATE entitlements SET image_credits=image_credits+10, updated_at=now() WHERE user_id=p.user_id;
  ELSIF p.product = 'download' THEN UPDATE entitlements SET download_credits=download_credits+1, updated_at=now() WHERE user_id=p.user_id;
  ELSE
    UPDATE entitlements SET plan = CASE WHEN p.product='combo_plan' THEN 'combo' ELSE 'video' END,
      plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + interval '30 days', updated_at=now()
    WHERE user_id=p.user_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.grant_purchase(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_purchase(text,text) TO service_role;