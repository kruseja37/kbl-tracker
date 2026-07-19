-- Dedicated Snake live-room authority.
-- Public draft truth has one row. Private boards, claims, and intents are
-- RPC-only. Public events contain nudge metadata, never private payloads.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_public_payload_safe(p_value JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp
AS $fn$
DECLARE v_key TEXT; v_key_norm TEXT; v_child JSONB;
BEGIN
  IF p_value IS NULL THEN RETURN FALSE; END IF;
  IF jsonb_typeof(p_value) = 'object' THEN
    FOR v_key, v_child IN SELECT key, value FROM jsonb_each(p_value) LOOP
      v_key_norm := lower(regexp_replace(v_key, '[^a-z0-9]', '', 'g'));
      IF v_key_norm IN (
        'board','seatboard','seatboards','farmseatboard','farmseatboards',
        'rankings','zerointerestplayerids','frozenplayerids','privatepayload','privateboard',
        'roomlogbyteamid','opentradeoffers','snakecompanions','companionroompublication',
        'correctionsnapshots','farmprospectsnapshot','seatingcertificate',
        'hosttokenhash','creationhash','requesthash','eventkey'
      )
        OR v_key_norm LIKE 'private%'
        OR v_key_norm LIKE '%hash' THEN RETURN FALSE; END IF;
      IF NOT public.kbl_snake_live_public_payload_safe(v_child) THEN RETURN FALSE; END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    FOR v_child IN SELECT value FROM jsonb_array_elements(p_value) LOOP
      IF NOT public.kbl_snake_live_public_payload_safe(v_child) THEN RETURN FALSE; END IF;
    END LOOP;
  END IF;
  RETURN TRUE;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_hash_json(p_value JSONB)
RETURNS BYTEA LANGUAGE sql IMMUTABLE SET search_path = public, extensions, pg_temp
AS $fn$ SELECT extensions.digest(convert_to(p_value::TEXT, 'UTF8'), 'sha256'); $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_hash_token(p_token TEXT)
RETURNS BYTEA LANGUAGE plpgsql IMMUTABLE SET search_path = public, extensions, pg_temp
AS $fn$
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RAISE EXCEPTION 'A capability token must contain at least 32 characters.'; END IF;
  RETURN extensions.digest(convert_to(p_token, 'UTF8'), 'sha256');
END;
$fn$;

CREATE TABLE public.snake_live_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  room_code TEXT NOT NULL CHECK (room_code ~ '^[0-9]{4}$'),
  phase TEXT NOT NULL CHECK (phase IN ('MLB','FARM')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','complete','closed')),
  public_revision BIGINT NOT NULL DEFAULT 0 CHECK (public_revision >= 0),
  public_state JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(public_state) = 'object') CHECK (public.kbl_snake_live_public_payload_safe(public_state)),
  host_device_id TEXT NOT NULL CHECK (length(btrim(host_device_id)) > 0),
  host_token_hash BYTEA NOT NULL,
  creation_hash BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (owner_user_id, session_id)
);
CREATE UNIQUE INDEX snake_live_rooms_open_code_unique ON public.snake_live_rooms(owner_user_id, room_code) WHERE status = 'open';

CREATE TABLE public.snake_live_devices (
  room_id UUID NOT NULL REFERENCES public.snake_live_rooms(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL CHECK (length(btrim(device_id)) > 0),
  token_hash BYTEA NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (room_id, device_id)
);

CREATE TABLE public.snake_live_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), room_id UUID NOT NULL REFERENCES public.snake_live_rooms(id) ON DELETE CASCADE,
  request_key TEXT NOT NULL, request_hash BYTEA NOT NULL, device_id TEXT NOT NULL, gm_name TEXT NOT NULL, team_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')), revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  resolution_key TEXT, resolution_hash BYTEA, created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), resolved_at TIMESTAMPTZ,
  UNIQUE (room_id, request_key), FOREIGN KEY (room_id, device_id) REFERENCES public.snake_live_devices(room_id, device_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX snake_live_claims_one_approved_team ON public.snake_live_claims(room_id, team_id) WHERE status = 'approved';
CREATE INDEX snake_live_claims_room_status ON public.snake_live_claims(room_id, status, created_at);

CREATE TABLE public.snake_live_seat_boards (
  room_id UUID NOT NULL REFERENCES public.snake_live_rooms(id) ON DELETE CASCADE, team_id TEXT NOT NULL,
  board_revision BIGINT NOT NULL CHECK (board_revision > 0), board JSONB NOT NULL CHECK (jsonb_typeof(board) = 'object'),
  updated_by_device_id TEXT NOT NULL, last_write_key TEXT NOT NULL, last_write_hash BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY (room_id, team_id)
);

CREATE TABLE public.snake_live_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), room_id UUID NOT NULL REFERENCES public.snake_live_rooms(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL, request_hash BYTEA NOT NULL, device_id TEXT NOT NULL, team_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pick','trade')), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  intent_revision BIGINT NOT NULL DEFAULT 1 CHECK (intent_revision > 0), expected_room_revision BIGINT NOT NULL CHECK (expected_room_revision >= 0),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'), resolution_key TEXT, resolution_hash BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), resolved_at TIMESTAMPTZ,
  UNIQUE (room_id, idempotency_key), FOREIGN KEY (room_id, device_id) REFERENCES public.snake_live_devices(room_id, device_id) ON DELETE CASCADE
);
CREATE INDEX snake_live_intents_room_status ON public.snake_live_intents(room_id, status, created_at);

CREATE TABLE public.snake_live_events (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, room_id UUID NOT NULL REFERENCES public.snake_live_rooms(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_revision BIGINT NOT NULL CHECK (room_revision >= 0), kind TEXT NOT NULL,
  public_payload JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(public_payload) = 'object') CHECK (public.kbl_snake_live_public_payload_safe(public_payload)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.snake_live_event_receipts (
  room_id UUID NOT NULL REFERENCES public.snake_live_rooms(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  request_hash BYTEA NOT NULL,
  event_id BIGINT NOT NULL UNIQUE REFERENCES public.snake_live_events(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, event_key)
);
CREATE INDEX snake_live_events_room_id_order ON public.snake_live_events(room_id, id);

ALTER TABLE public.snake_live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snake_live_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snake_live_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snake_live_seat_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snake_live_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snake_live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snake_live_event_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY snake_live_events_owner_read ON public.snake_live_events FOR SELECT TO authenticated USING ((SELECT auth.uid()) = owner_user_id);
REVOKE ALL ON public.snake_live_rooms, public.snake_live_devices, public.snake_live_claims, public.snake_live_seat_boards, public.snake_live_intents, public.snake_live_events, public.snake_live_event_receipts FROM anon, authenticated;
GRANT SELECT ON public.snake_live_events TO authenticated;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_room_json(p public.snake_live_rooms) RETURNS JSONB LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$
SELECT jsonb_build_object(
  'id',p.id,'owner_user_id',p.owner_user_id,'session_id',p.session_id,'room_code',p.room_code,
  'phase',p.phase,'status',p.status,'public_revision',p.public_revision,'public_state',p.public_state,
  'host_device_id',p.host_device_id,'created_at',p.created_at,'updated_at',p.updated_at
); $fn$;
CREATE OR REPLACE FUNCTION public.kbl_snake_live_claim_json(p public.snake_live_claims) RETURNS JSONB LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$ SELECT to_jsonb(p) - ARRAY['request_hash','resolution_key','resolution_hash']; $fn$;
CREATE OR REPLACE FUNCTION public.kbl_snake_live_board_json(p public.snake_live_seat_boards) RETURNS JSONB LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$ SELECT to_jsonb(p) - ARRAY['last_write_key','last_write_hash']; $fn$;
CREATE OR REPLACE FUNCTION public.kbl_snake_live_intent_json(p public.snake_live_intents) RETURNS JSONB LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$ SELECT to_jsonb(p) - ARRAY['request_hash','resolution_key','resolution_hash']; $fn$;
CREATE OR REPLACE FUNCTION public.kbl_snake_live_event_json(p public.snake_live_events) RETURNS JSONB LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$
SELECT jsonb_build_object(
  'id',p.id,'room_id',p.room_id,'room_revision',p.room_revision,'kind',p.kind,
  'public_payload',p.public_payload,'created_at',p.created_at
); $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_assert_owner(p_owner UUID) RETURNS VOID LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $fn$
BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF; IF auth.uid() <> p_owner THEN RAISE EXCEPTION 'Forbidden: this room belongs to another account.'; END IF; END; $fn$;
CREATE OR REPLACE FUNCTION public.kbl_snake_live_host_matches(p public.snake_live_rooms, p_device TEXT, p_token TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public, extensions, pg_temp AS $fn$ SELECT p.host_device_id = p_device AND p.host_token_hash = public.kbl_snake_live_hash_token(p_token); $fn$;
CREATE OR REPLACE FUNCTION public.kbl_snake_live_device_matches(p_room UUID, p_device TEXT, p_token TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public, extensions, pg_temp AS $fn$ SELECT EXISTS (SELECT 1 FROM public.snake_live_devices d WHERE d.room_id=p_room AND d.device_id=p_device AND d.status='active' AND d.token_hash=public.kbl_snake_live_hash_token(p_token)); $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_get_room(p_room_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u UUID:=auth.uid(); r public.snake_live_rooms;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id AND owner_user_id=u;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.kbl_snake_live_room_json(r);
END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_get_room_by_session(p_session_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u UUID:=auth.uid(); r public.snake_live_rooms;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  SELECT * INTO r FROM public.snake_live_rooms WHERE owner_user_id=u AND session_id=p_session_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.kbl_snake_live_room_json(r);
END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_find_open_room_by_code(p_room_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u UUID:=auth.uid(); r public.snake_live_rooms;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  SELECT * INTO r FROM public.snake_live_rooms WHERE owner_user_id=u AND room_code=p_room_code AND status='open';
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.kbl_snake_live_room_json(r);
END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_list_events(p_room_id UUID,p_after_event_id BIGINT DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u UUID:=auth.uid(); out JSONB;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  IF p_after_event_id IS NULL OR p_after_event_id<0 THEN RAISE EXCEPTION 'The event cursor is invalid.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.snake_live_rooms WHERE id=p_room_id AND owner_user_id=u) THEN RETURN '[]'::JSONB; END IF;
  SELECT COALESCE(jsonb_agg(public.kbl_snake_live_event_json(e) ORDER BY e.id),'[]'::JSONB) INTO out
  FROM public.snake_live_events e WHERE e.room_id=p_room_id AND e.id>p_after_event_id;
  RETURN out;
END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_emit_event(p_room UUID,p_revision BIGINT,p_key TEXT,p_hash BYTEA,p_kind TEXT,p_payload JSONB) RETURNS VOID LANGUAGE plpgsql SET search_path=public,pg_temp AS $fn$
DECLARE event_id BIGINT; owner_id UUID;
BEGIN
  IF jsonb_typeof(p_payload)<>'object' OR NOT public.kbl_snake_live_public_payload_safe(p_payload) THEN RAISE EXCEPTION 'Public events cannot contain private board data.'; END IF;
  SELECT owner_user_id INTO owner_id FROM public.snake_live_rooms WHERE id=p_room;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'The live room was not found.'; END IF;
  INSERT INTO public.snake_live_events(room_id,owner_user_id,room_revision,kind,public_payload)
  VALUES(p_room,owner_id,p_revision,p_kind,p_payload) RETURNING id INTO event_id;
  INSERT INTO public.snake_live_event_receipts(room_id,event_key,request_hash,event_id)
  VALUES(p_room,p_key,p_hash,event_id);
END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_create_room(p_session_id TEXT,p_room_code TEXT,p_phase TEXT,p_host_device_id TEXT,p_host_token TEXT,p_public_state JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE u UUID:=auth.uid(); r public.snake_live_rooms; h BYTEA;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  IF p_room_code !~ '^[0-9]{4}$' OR p_phase NOT IN ('MLB','FARM') OR length(btrim(p_session_id))=0 OR length(btrim(p_host_device_id))=0 THEN RAISE EXCEPTION 'The room request is invalid.'; END IF;
  IF jsonb_typeof(p_public_state)<>'object' OR NOT public.kbl_snake_live_public_payload_safe(p_public_state) THEN RAISE EXCEPTION 'Public room state cannot contain private board data.'; END IF;
  h:=public.kbl_snake_live_hash_json(jsonb_build_object('session',p_session_id,'code',p_room_code,'phase',p_phase,'host',p_host_device_id,'token',encode(public.kbl_snake_live_hash_token(p_host_token),'hex'),'state',p_public_state));
  SELECT * INTO r FROM public.snake_live_rooms WHERE owner_user_id=u AND session_id=p_session_id FOR UPDATE;
  IF FOUND THEN IF r.creation_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: this session has another room.'; END IF; RETURN public.kbl_snake_live_room_json(r); END IF;
  INSERT INTO public.snake_live_rooms(owner_user_id,session_id,room_code,phase,public_state,host_device_id,host_token_hash,creation_hash)
  VALUES(u,p_session_id,p_room_code,p_phase,p_public_state,p_host_device_id,public.kbl_snake_live_hash_token(p_host_token),h) RETURNING * INTO r;
  INSERT INTO public.snake_live_devices(room_id,device_id,token_hash)
  VALUES(r.id,p_host_device_id,public.kbl_snake_live_hash_token(p_host_token));
  PERFORM public.kbl_snake_live_emit_event(r.id,0,'create:'||p_session_id,h,'ROOM_CREATED',jsonb_build_object('roomRevision',0,'phase',p_phase));
  RETURN public.kbl_snake_live_room_json(r);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Conflict: that room code is active.';
END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_submit_claim(p_room_id UUID,p_device_id TEXT,p_device_token TEXT,p_request_key TEXT,p_gm_name TEXT,p_team_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; d public.snake_live_devices; c public.snake_live_claims; h BYTEA; n INTEGER; already BOOLEAN;
BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF r.status<>'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
  IF p_device_id=r.host_device_id THEN RAISE EXCEPTION 'Forbidden: the host device cannot claim a companion desk.'; END IF;
  IF length(btrim(p_device_id))=0 OR length(btrim(p_request_key))=0 OR length(btrim(p_gm_name))=0 OR length(btrim(p_team_id))=0 THEN RAISE EXCEPTION 'The claim request is incomplete.'; END IF;
  SELECT * INTO d FROM public.snake_live_devices WHERE room_id=p_room_id AND device_id=p_device_id FOR UPDATE;
  IF FOUND THEN IF d.status<>'active' OR d.token_hash<>public.kbl_snake_live_hash_token(p_device_token) THEN RAISE EXCEPTION 'Forbidden: the device token does not match.'; END IF; UPDATE public.snake_live_devices SET last_seen_at=clock_timestamp() WHERE room_id=p_room_id AND device_id=p_device_id;
  ELSE INSERT INTO public.snake_live_devices(room_id,device_id,token_hash) VALUES(p_room_id,p_device_id,public.kbl_snake_live_hash_token(p_device_token)); END IF;
  h:=public.kbl_snake_live_hash_json(jsonb_build_object('device',p_device_id,'key',p_request_key,'gm',p_gm_name,'team',p_team_id));
  SELECT * INTO c FROM public.snake_live_claims WHERE room_id=p_room_id AND request_key=p_request_key FOR UPDATE;
  IF FOUND THEN IF c.request_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the claim key has different data.'; END IF; RETURN public.kbl_snake_live_claim_json(c); END IF;
  SELECT count(DISTINCT device_id),bool_or(device_id=p_device_id) INTO n,already FROM public.snake_live_claims WHERE room_id=p_room_id AND status IN ('pending','approved');
  IF COALESCE(n,0)>=3 AND NOT COALESCE(already,FALSE) THEN RAISE EXCEPTION 'Conflict: this room already has three companion devices.'; END IF;
  INSERT INTO public.snake_live_claims(room_id,request_key,request_hash,device_id,gm_name,team_id) VALUES(p_room_id,p_request_key,h,p_device_id,btrim(p_gm_name),p_team_id) RETURNING * INTO c;
  PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,'claim:'||p_request_key,h,'CLAIM_ACTIVITY',jsonb_build_object('teamId',p_team_id,'claimId',c.id,'claimRevision',c.revision,'action','submitted'));
  RETURN public.kbl_snake_live_claim_json(c); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_read_board(p_room_id UUID,p_device_id TEXT,p_device_token TEXT,p_team_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; b public.snake_live_seat_boards; BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id);
IF p_device_id=r.host_device_id THEN RAISE EXCEPTION 'Forbidden: the host device cannot read a companion board.'; END IF;
IF NOT public.kbl_snake_live_device_matches(p_room_id,p_device_id,p_device_token) OR NOT EXISTS(SELECT 1 FROM public.snake_live_claims c WHERE c.room_id=p_room_id AND c.device_id=p_device_id AND c.team_id=p_team_id AND c.status='approved') THEN RAISE EXCEPTION 'Forbidden: this device is not approved for that team.'; END IF;
SELECT * INTO b FROM public.snake_live_seat_boards WHERE room_id=p_room_id AND team_id=p_team_id; IF NOT FOUND THEN RETURN NULL; END IF; RETURN public.kbl_snake_live_board_json(b); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_write_board_core(p_room_id UUID,p_device_id TEXT,p_device_token TEXT,p_team_id TEXT,p_expected BIGINT,p_key TEXT,p_board JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; b public.snake_live_seat_boards; h BYTEA;
BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF r.status<>'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
IF p_device_id=r.host_device_id THEN RAISE EXCEPTION 'Forbidden: the host device cannot write a companion board.'; END IF;
IF NOT public.kbl_snake_live_device_matches(p_room_id,p_device_id,p_device_token) OR NOT EXISTS(SELECT 1 FROM public.snake_live_claims c WHERE c.room_id=p_room_id AND c.device_id=p_device_id AND c.team_id=p_team_id AND c.status='approved') THEN RAISE EXCEPTION 'Forbidden: this device is not approved for that team.'; END IF;
IF p_board IS NULL OR jsonb_typeof(p_board)<>'object' OR length(btrim(COALESCE(p_key,'')))=0 OR p_expected IS NULL OR p_expected<1 THEN RAISE EXCEPTION 'The board write is invalid.'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(p_room_id::TEXT),hashtext(p_team_id));
h:=public.kbl_snake_live_hash_json(jsonb_build_object('team',p_team_id,'expected',p_expected,'board',p_board));
SELECT * INTO b FROM public.snake_live_seat_boards WHERE room_id=p_room_id AND team_id=p_team_id FOR UPDATE;
IF FOUND AND b.last_write_key=p_key THEN IF b.last_write_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the board write differs.'; END IF; RETURN public.kbl_snake_live_board_json(b); END IF;
IF NOT FOUND THEN RAISE EXCEPTION 'The private board has not been seeded.'; END IF;
IF b.board_revision<>p_expected THEN RAISE EXCEPTION 'Stale expected revision for the board.'; END IF;
UPDATE public.snake_live_seat_boards SET board_revision=board_revision+1,board=p_board,updated_by_device_id=p_device_id,last_write_key=p_key,last_write_hash=h,updated_at=clock_timestamp() WHERE room_id=p_room_id AND team_id=p_team_id RETURNING * INTO b;
PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,'board:'||p_team_id||':'||p_key,h,'BOARD_ACTIVITY',jsonb_build_object('teamId',p_team_id,'boardRevision',b.board_revision,'action','changed'));
RETURN public.kbl_snake_live_board_json(b); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_write_board(p_room_id UUID,p_device_id TEXT,p_device_token TEXT,p_team_id TEXT,p_expected_board_revision BIGINT,p_idempotency_key TEXT,p_board JSONB)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$ SELECT public.kbl_snake_live_write_board_core(p_room_id,p_device_id,p_device_token,p_team_id,p_expected_board_revision,p_idempotency_key,p_board); $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_seed_board_as_host(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT,p_team_id TEXT,p_idempotency_key TEXT,p_board JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; b public.snake_live_seat_boards; h BYTEA; seed_key TEXT:='seed:'||p_idempotency_key;
BEGIN
  SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF;
  PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id);
  IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF;
  IF r.status<>'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
  IF length(btrim(COALESCE(p_team_id,'')))=0 OR length(btrim(COALESCE(p_idempotency_key,'')))=0 OR p_board IS NULL OR jsonb_typeof(p_board)<>'object' THEN RAISE EXCEPTION 'The board seed is invalid.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_room_id::TEXT),hashtext(p_team_id));
  h:=public.kbl_snake_live_hash_json(jsonb_build_object('team',p_team_id,'board',p_board));
  SELECT * INTO b FROM public.snake_live_seat_boards WHERE room_id=p_room_id AND team_id=p_team_id FOR UPDATE;
  IF FOUND THEN
    IF b.last_write_key=seed_key AND b.last_write_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the board seed differs.'; END IF;
    RETURN jsonb_build_object('room_id',b.room_id,'team_id',b.team_id,'board_revision',b.board_revision,'seeded',FALSE);
  END IF;
  INSERT INTO public.snake_live_seat_boards(room_id,team_id,board_revision,board,updated_by_device_id,last_write_key,last_write_hash)
  VALUES(p_room_id,p_team_id,1,p_board,p_host_device_id,seed_key,h) RETURNING * INTO b;
  RETURN jsonb_build_object('room_id',b.room_id,'team_id',b.team_id,'board_revision',b.board_revision,'seeded',TRUE);
END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_submit_intent(p_room_id UUID,p_device_id TEXT,p_device_token TEXT,p_team_id TEXT,p_idempotency_key TEXT,p_kind TEXT,p_expected_room_revision BIGINT,p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; i public.snake_live_intents; h BYTEA;
BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF r.status<>'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
IF NOT public.kbl_snake_live_device_matches(p_room_id,p_device_id,p_device_token) OR NOT EXISTS(SELECT 1 FROM public.snake_live_claims c WHERE c.room_id=p_room_id AND c.device_id=p_device_id AND c.team_id=p_team_id AND c.status='approved') THEN RAISE EXCEPTION 'Forbidden: this device is not approved for that team.'; END IF;
IF p_kind NOT IN ('pick','trade') OR jsonb_typeof(p_payload)<>'object' OR length(btrim(p_idempotency_key))=0 THEN RAISE EXCEPTION 'The companion intent is invalid.'; END IF;
IF p_kind='pick' AND (
  length(btrim(COALESCE(p_payload->>'playerId','')))=0
  OR jsonb_typeof(p_payload->'pick')<>'number'
  OR COALESCE(p_payload->>'pick','') !~ '^[1-9][0-9]*$'
  OR jsonb_typeof(p_payload->'sessionRevision')<>'number'
  OR COALESCE(p_payload->>'sessionRevision','') !~ '^(0|[1-9][0-9]*)$'
) THEN RAISE EXCEPTION 'The private pick intent is invalid.'; END IF;
IF p_kind='trade' AND (
  p_payload->>'action' NOT IN ('POST','NOD','WITHDRAW','DECLINE')
  OR length(btrim(COALESCE(p_payload->>'buyerTeamId','')))=0
  OR length(btrim(COALESCE(p_payload->>'sellerTeamId','')))=0
  OR p_payload->>'buyerTeamId'=p_payload->>'sellerTeamId'
  OR length(btrim(COALESCE(p_payload->>'offerId','')))=0
  OR p_team_id NOT IN (p_payload->>'buyerTeamId',p_payload->>'sellerTeamId')
) THEN RAISE EXCEPTION 'The private trade intent is invalid.'; END IF;
h:=public.kbl_snake_live_hash_json(jsonb_build_object('device',p_device_id,'team',p_team_id,'kind',p_kind,'expected',p_expected_room_revision,'payload',p_payload));
SELECT * INTO i FROM public.snake_live_intents WHERE room_id=p_room_id AND idempotency_key=p_idempotency_key FOR UPDATE; IF FOUND THEN IF i.request_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the intent differs.'; END IF; RETURN public.kbl_snake_live_intent_json(i); END IF;
IF r.public_revision<>p_expected_room_revision THEN RAISE EXCEPTION 'Stale expected revision for the room.'; END IF;
INSERT INTO public.snake_live_intents(room_id,idempotency_key,request_hash,device_id,team_id,kind,expected_room_revision,payload) VALUES(p_room_id,p_idempotency_key,h,p_device_id,p_team_id,p_kind,p_expected_room_revision,p_payload) RETURNING * INTO i;
PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,'intent:'||p_idempotency_key,h,'INTENT_ACTIVITY',jsonb_build_object('teamId',p_team_id,'intentId',i.id,'intentRevision',i.intent_revision,'kind',p_kind,'action','submitted'));
RETURN public.kbl_snake_live_intent_json(i); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_submit_host_trade_intent(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT,p_team_id TEXT,p_idempotency_key TEXT,p_expected_room_revision BIGINT,p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; i public.snake_live_intents; h BYTEA;
BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF; IF r.status<>'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
IF jsonb_typeof(p_payload)<>'object' OR length(btrim(p_idempotency_key))=0
  OR p_payload->>'action' NOT IN ('POST','NOD','WITHDRAW','DECLINE')
  OR length(btrim(COALESCE(p_payload->>'buyerTeamId','')))=0
  OR length(btrim(COALESCE(p_payload->>'sellerTeamId','')))=0
  OR p_payload->>'buyerTeamId'=p_payload->>'sellerTeamId'
  OR length(btrim(COALESCE(p_payload->>'offerId','')))=0
  OR p_team_id NOT IN (p_payload->>'buyerTeamId',p_payload->>'sellerTeamId')
THEN RAISE EXCEPTION 'The private host trade intent is invalid.'; END IF;
h:=public.kbl_snake_live_hash_json(jsonb_build_object('device',p_host_device_id,'team',p_team_id,'kind','trade','expected',p_expected_room_revision,'payload',p_payload));
SELECT * INTO i FROM public.snake_live_intents WHERE room_id=p_room_id AND idempotency_key=p_idempotency_key FOR UPDATE; IF FOUND THEN IF i.request_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the host trade intent differs.'; END IF; RETURN public.kbl_snake_live_intent_json(i); END IF;
IF r.public_revision<>p_expected_room_revision THEN RAISE EXCEPTION 'Stale expected revision for the room.'; END IF;
INSERT INTO public.snake_live_intents(room_id,idempotency_key,request_hash,device_id,team_id,kind,expected_room_revision,payload) VALUES(p_room_id,p_idempotency_key,h,p_host_device_id,p_team_id,'trade',p_expected_room_revision,p_payload) RETURNING * INTO i;
PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,'intent:'||p_idempotency_key,h,'INTENT_ACTIVITY',jsonb_build_object('teamId',p_team_id,'intentId',i.id,'intentRevision',i.intent_revision,'kind','trade','action','submitted'));
RETURN public.kbl_snake_live_intent_json(i); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_publish_room(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT,p_expected_room_revision BIGINT,p_idempotency_key TEXT,p_public_state JSONB,p_event_kind TEXT,p_public_event JSONB,p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; receipt public.snake_live_event_receipts; h BYTEA;
BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF;
IF jsonb_typeof(p_public_state)<>'object' OR jsonb_typeof(p_public_event)<>'object' OR NOT public.kbl_snake_live_public_payload_safe(p_public_state) OR NOT public.kbl_snake_live_public_payload_safe(p_public_event) THEN RAISE EXCEPTION 'Public draft truth cannot contain private board data.'; END IF;
IF p_status IS NOT NULL AND p_status NOT IN ('open','complete','closed') THEN RAISE EXCEPTION 'The room status is invalid.'; END IF;
h:=public.kbl_snake_live_hash_json(jsonb_build_object('expected',p_expected_room_revision,'state',p_public_state,'kind',p_event_kind,'event',p_public_event,'status',p_status));
SELECT * INTO receipt FROM public.snake_live_event_receipts WHERE room_id=p_room_id AND event_key=p_idempotency_key FOR UPDATE; IF FOUND THEN IF receipt.request_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the public operation differs.'; END IF; RETURN public.kbl_snake_live_room_json(r); END IF;
IF r.public_revision<>p_expected_room_revision THEN RAISE EXCEPTION 'Stale expected revision for the room.'; END IF;
UPDATE public.snake_live_rooms SET public_revision=public_revision+1,public_state=p_public_state,status=COALESCE(p_status,status),updated_at=clock_timestamp() WHERE id=p_room_id RETURNING * INTO r;
PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,p_idempotency_key,h,p_event_kind,p_public_event);
RETURN public.kbl_snake_live_room_json(r); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_close_room(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT,p_expected_room_revision BIGINT,p_idempotency_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; receipt public.snake_live_event_receipts; h BYTEA; BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF;
h:=public.kbl_snake_live_hash_json(jsonb_build_object('expected',p_expected_room_revision,'action','close')); SELECT * INTO receipt FROM public.snake_live_event_receipts WHERE room_id=p_room_id AND event_key=p_idempotency_key FOR UPDATE; IF FOUND THEN IF receipt.request_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the close operation differs.'; END IF; RETURN public.kbl_snake_live_room_json(r); END IF;
IF r.public_revision<>p_expected_room_revision THEN RAISE EXCEPTION 'Stale expected revision for the room.'; END IF; UPDATE public.snake_live_rooms SET public_revision=public_revision+1,status='closed',updated_at=clock_timestamp() WHERE id=p_room_id RETURNING * INTO r; PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,p_idempotency_key,h,'ROOM_CLOSED',jsonb_build_object('roomRevision',r.public_revision)); RETURN public.kbl_snake_live_room_json(r); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_list_intents(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; out JSONB; BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF;
SELECT COALESCE(jsonb_agg(public.kbl_snake_live_intent_json(i) ORDER BY i.created_at,i.id),'[]') INTO out FROM public.snake_live_intents i WHERE i.room_id=p_room_id; RETURN out; END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_list_device_intents(p_room_id UUID,p_device_id TEXT,p_device_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; out JSONB; BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_device_matches(p_room_id,p_device_id,p_device_token) THEN RAISE EXCEPTION 'Forbidden: the device token does not match.'; END IF;
SELECT COALESCE(jsonb_agg(public.kbl_snake_live_intent_json(i) ORDER BY i.created_at,i.id),'[]') INTO out
FROM public.snake_live_intents i WHERE i.room_id=p_room_id AND (
  i.device_id=p_device_id OR (i.kind='trade' AND EXISTS(
    SELECT 1 FROM public.snake_live_claims c WHERE c.room_id=p_room_id AND c.device_id=p_device_id AND c.status='approved'
    AND c.team_id IN (i.payload->>'buyerTeamId',i.payload->>'sellerTeamId')
  ))
); RETURN out; END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_resolve_intent(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT,p_intent_id UUID,p_expected_intent_revision BIGINT,p_idempotency_key TEXT,p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; i public.snake_live_intents; h BYTEA;
BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF; IF p_status NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'The intent result is invalid.'; END IF;
SELECT * INTO i FROM public.snake_live_intents WHERE room_id=p_room_id AND id=p_intent_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live intent was not found.'; END IF;
h:=public.kbl_snake_live_hash_json(jsonb_build_object('intent',p_intent_id,'expected',p_expected_intent_revision,'status',p_status));
IF i.resolution_key=p_idempotency_key THEN IF i.resolution_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the intent result differs.'; END IF; RETURN public.kbl_snake_live_intent_json(i); END IF;
IF i.intent_revision<>p_expected_intent_revision OR i.status<>'pending' THEN RAISE EXCEPTION 'Stale expected revision for the intent.'; END IF;
UPDATE public.snake_live_intents SET status=p_status,intent_revision=intent_revision+1,resolution_key=p_idempotency_key,resolution_hash=h,resolved_at=clock_timestamp() WHERE id=i.id RETURNING * INTO i;
PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,'intent-resolution:'||p_idempotency_key,h,'INTENT_ACTIVITY',jsonb_build_object('teamId',i.team_id,'intentId',i.id,'intentRevision',i.intent_revision,'kind',i.kind,'action',p_status));
RETURN public.kbl_snake_live_intent_json(i); END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_list_claims(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; out JSONB; BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF;
SELECT COALESCE(jsonb_agg(public.kbl_snake_live_claim_json(c) ORDER BY c.created_at,c.id),'[]') INTO out FROM public.snake_live_claims c WHERE c.room_id=p_room_id; RETURN out; END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_list_device_claims(p_room_id UUID,p_device_id TEXT,p_device_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; out JSONB; BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_device_matches(p_room_id,p_device_id,p_device_token) THEN RAISE EXCEPTION 'Forbidden: the device token does not match.'; END IF;
SELECT COALESCE(jsonb_agg(public.kbl_snake_live_claim_json(c) ORDER BY c.created_at,c.id),'[]') INTO out FROM public.snake_live_claims c WHERE c.room_id=p_room_id AND c.device_id=p_device_id; RETURN out; END; $fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_resolve_claim(p_room_id UUID,p_host_device_id TEXT,p_host_token TEXT,p_claim_id UUID,p_expected_claim_revision BIGINT,p_idempotency_key TEXT,p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $fn$
DECLARE r public.snake_live_rooms; c public.snake_live_claims; h BYTEA;
BEGIN SELECT * INTO r FROM public.snake_live_rooms WHERE id=p_room_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF; PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id); IF NOT public.kbl_snake_live_host_matches(r,p_host_device_id,p_host_token) THEN RAISE EXCEPTION 'Forbidden: the host token does not match.'; END IF; IF p_status NOT IN ('approved','revoked') THEN RAISE EXCEPTION 'The claim result is invalid.'; END IF;
  SELECT * INTO c FROM public.snake_live_claims WHERE room_id=p_room_id AND id=p_claim_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'The live claim was not found.'; END IF;
  h:=public.kbl_snake_live_hash_json(jsonb_build_object('claim',p_claim_id,'expected',p_expected_claim_revision,'status',p_status));
  IF c.resolution_key=p_idempotency_key THEN IF c.resolution_hash<>h THEN RAISE EXCEPTION 'Idempotency conflict: the claim result differs.'; END IF; RETURN public.kbl_snake_live_claim_json(c); END IF;
  IF c.revision<>p_expected_claim_revision THEN RAISE EXCEPTION 'Stale expected revision for the claim.'; END IF;
  IF p_status='approved' THEN UPDATE public.snake_live_claims SET status='revoked',revision=revision+1,resolved_at=clock_timestamp() WHERE room_id=p_room_id AND team_id=c.team_id AND status='approved' AND id<>c.id; END IF;
  UPDATE public.snake_live_claims SET status=p_status,revision=revision+1,resolution_key=p_idempotency_key,resolution_hash=h,resolved_at=clock_timestamp() WHERE id=c.id RETURNING * INTO c;
  PERFORM public.kbl_snake_live_emit_event(p_room_id,r.public_revision,'claim-resolution:'||p_idempotency_key,h,'CLAIM_ACTIVITY',jsonb_build_object('teamId',c.team_id,'claimId',c.id,'claimRevision',c.revision,'action',p_status));
  RETURN public.kbl_snake_live_claim_json(c); END; $fn$;

DO $realtime$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='snake_live_rooms') THEN ALTER PUBLICATION supabase_realtime DROP TABLE public.snake_live_rooms; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='snake_live_events') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.snake_live_events; END IF;
  END IF;
END; $realtime$;

DO $permissions$ DECLARE f RECORD; BEGIN
  FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'kbl_snake_live_%'
  LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature); END LOOP;
END; $permissions$;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_create_room(TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_get_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_get_room_by_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_find_open_room_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_list_events(UUID,BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_submit_claim(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_list_claims(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_list_device_claims(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_resolve_claim(UUID,TEXT,TEXT,UUID,BIGINT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_read_board(UUID,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_write_board(UUID,TEXT,TEXT,TEXT,BIGINT,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_seed_board_as_host(UUID,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_submit_intent(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,BIGINT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_submit_host_trade_intent(UUID,TEXT,TEXT,TEXT,TEXT,BIGINT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_list_intents(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_list_device_intents(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_resolve_intent(UUID,TEXT,TEXT,UUID,BIGINT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_publish_room(UUID,TEXT,TEXT,BIGINT,TEXT,JSONB,TEXT,JSONB,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_close_room(UUID,TEXT,TEXT,BIGINT,TEXT) TO authenticated;
