ALTER TABLE public.payments ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_grant(_user uuid, _product text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO entitlements(user_id) VALUES (_user) ON CONFLICT DO NOTHING;
  IF _product = 'image_pack' THEN UPDATE entitlements SET image_credits=image_credits+10, updated_at=now() WHERE user_id=_user;
  ELSIF _product = 'download' THEN UPDATE entitlements SET download_credits=download_credits+1, updated_at=now() WHERE user_id=_user;
  ELSE
    UPDATE entitlements SET plan = CASE WHEN _product='combo_plan' THEN 'combo' ELSE 'video' END,
      plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + interval '30 days', updated_at=now()
    WHERE user_id=_user;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.apply_grant(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_grant(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_purchase(_order text, _payment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payments;
BEGIN
  SELECT * INTO p FROM payments WHERE provider_order_id = _order FOR UPDATE;
  IF NOT FOUND OR p.status = 'paid' THEN RETURN; END IF;
  UPDATE payments SET status='paid', provider_payment_id=_payment WHERE id=p.id;
  IF p.user_id IS NOT NULL THEN PERFORM apply_grant(p.user_id, p.product); END IF;
END $$;

-- Guest paid first, then signed up: attach the paid order to the new account once.
CREATE OR REPLACE FUNCTION public.claim_payment(_order text, _user uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payments;
BEGIN
  SELECT * INTO p FROM payments WHERE provider_order_id = _order FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF p.user_id IS NOT NULL THEN RETURN CASE WHEN p.user_id=_user THEN 'done' ELSE 'taken' END; END IF;
  IF p.status <> 'paid' THEN RETURN 'pending'; END IF;
  UPDATE payments SET user_id=_user WHERE id=p.id;
  PERFORM apply_grant(_user, p.product);
  RETURN 'done';
END $$;
REVOKE ALL ON FUNCTION public.claim_payment(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment(text,uuid) TO service_role;