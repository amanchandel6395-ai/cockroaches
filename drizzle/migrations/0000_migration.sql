CREATE TABLE public.entitlements (
  user_id uuid PRIMARY KEY,
  image_credits int NOT NULL DEFAULT 0,
  download_credits int NOT NULL DEFAULT 0,
  plan text CHECK (plan IN ('video','combo')),
  plan_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entitlements" ON public.entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.usage_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video','download')),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_log_user_day ON public.usage_log (user_id, kind, created_at);
GRANT SELECT ON public.usage_log TO authenticated;
GRANT ALL ON public.usage_log TO service_role;
GRANT USAGE ON SEQUENCE public.usage_log_id_seq TO service_role;
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage" ON public.usage_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product text NOT NULL CHECK (product IN ('image_pack','download','video_plan','combo_plan')),
  amount_inr int NOT NULL,
  status text NOT NULL DEFAULT 'created',
  provider_order_id text,
  provider_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Atomically decide + record use. Returns 'ok:<source>' or 'denied:<reason>'.
CREATE OR REPLACE FUNCTION public.consume_quota(_user uuid, _kind text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.entitlements; today int; ever int; active bool;
BEGIN
  INSERT INTO entitlements(user_id) VALUES (_user) ON CONFLICT DO NOTHING;
  SELECT * INTO e FROM entitlements WHERE user_id = _user FOR UPDATE;
  active := e.plan IS NOT NULL AND e.plan_expires_at > now();
  SELECT count(*) INTO today FROM usage_log WHERE user_id=_user AND kind=_kind AND created_at > date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' AND source LIKE 'plan%';
  IF _kind = 'image' THEN
    SELECT count(*) INTO ever FROM usage_log WHERE user_id=_user AND kind='image';
    IF ever = 0 THEN INSERT INTO usage_log(user_id,kind,source) VALUES (_user,'image','free'); RETURN 'ok:free'; END IF;
    IF active AND e.plan='combo' AND today < 10 THEN INSERT INTO usage_log(user_id,kind,source) VALUES (_user,'image','plan'); RETURN 'ok:plan'; END IF;
    IF e.image_credits > 0 THEN
      UPDATE entitlements SET image_credits=image_credits-1, updated_at=now() WHERE user_id=_user;
      INSERT INTO usage_log(user_id,kind,source) VALUES (_user,'image','credit'); RETURN 'ok:credit';
    END IF;
    RETURN 'denied:image_pack';
  ELSIF _kind = 'video' THEN
    IF active AND ((e.plan='video' AND today < 5) OR (e.plan='combo' AND today < 8)) THEN
      INSERT INTO usage_log(user_id,kind,source) VALUES (_user,'video','plan'); RETURN 'ok:plan';
    END IF;
    RETURN CASE WHEN active THEN 'denied:daily_limit' ELSE 'denied:video_plan' END;
  ELSIF _kind = 'download' THEN
    IF e.download_credits > 0 THEN
      UPDATE entitlements SET download_credits=download_credits-1, updated_at=now() WHERE user_id=_user;
      INSERT INTO usage_log(user_id,kind,source) VALUES (_user,'download','credit'); RETURN 'ok:credit';
    END IF;
    RETURN 'denied:download';
  END IF;
  RETURN 'denied:unknown';
END $$;
REVOKE ALL ON FUNCTION public.consume_quota(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_quota(uuid,text) TO service_role;

-- Refund when AI fails
CREATE OR REPLACE FUNCTION public.refund_quota(_user uuid, _source text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM usage_log WHERE id = (SELECT id FROM usage_log WHERE user_id=_user AND kind='image' ORDER BY created_at DESC LIMIT 1);
  IF _source = 'credit' THEN UPDATE entitlements SET image_credits=image_credits+1 WHERE user_id=_user; END IF;
END $$;
REVOKE ALL ON FUNCTION public.refund_quota(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_quota(uuid,text) TO service_role;