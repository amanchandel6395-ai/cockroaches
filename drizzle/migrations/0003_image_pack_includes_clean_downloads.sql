CREATE OR REPLACE FUNCTION public.apply_grant(_user uuid, _product text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO entitlements(user_id) VALUES (_user) ON CONFLICT DO NOTHING;
  IF _product = 'image_pack' THEN UPDATE entitlements SET image_credits=image_credits+10, download_credits=download_credits+10, updated_at=now() WHERE user_id=_user;
  ELSIF _product = 'download' THEN UPDATE entitlements SET download_credits=download_credits+1, updated_at=now() WHERE user_id=_user;
  ELSE
    UPDATE entitlements SET plan = CASE WHEN _product='combo_plan' THEN 'combo' ELSE 'video' END,
      plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + interval '30 days', updated_at=now()
    WHERE user_id=_user;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.consume_quota(_user uuid, _kind text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    IF active AND e.plan='combo' THEN INSERT INTO usage_log(user_id,kind,source) VALUES (_user,'download','plan'); RETURN 'ok:plan'; END IF;
    IF e.download_credits > 0 THEN
      UPDATE entitlements SET download_credits=download_credits-1, updated_at=now() WHERE user_id=_user;
      INSERT INTO usage_log(user_id,kind,source) VALUES (_user,'download','credit'); RETURN 'ok:credit';
    END IF;
    RETURN 'denied:download';
  END IF;
  RETURN 'denied:unknown';
END $function$;