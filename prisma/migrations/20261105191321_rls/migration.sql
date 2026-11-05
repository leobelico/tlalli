-- Row Level Security for multi-tenant isolation.
--
-- The application runs every tenant query inside a transaction that does:
--   SET LOCAL ROLE app_rls;
--   SELECT set_config('app.org_id', '<org uuid>', true);
-- `app_rls` is NOT the table owner and has no BYPASSRLS, so policies always apply.
-- The owner role (postgres) is only used by a few audited server modules (session lookup,
-- invitations, public webhooks routing, seed) and by migrations.

-- 1. Role -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    CREATE ROLE app_rls NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;

GRANT app_rls TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO app_rls;

-- 2. Helper -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_current_org() RETURNS uuid
  LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.org_id', true), '')::uuid $$;

GRANT EXECUTE ON FUNCTION public.app_current_org() TO app_rls;

-- 3. Lock down Supabase's auto-exposed REST API (PostgREST) -------------------
-- All data access goes through the Next.js server. anon/authenticated get nothing.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- 4. Organizations: a tenant can only see/update itself ---------------------
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON "organizations" TO app_rls;
CREATE POLICY tenant_isolation ON "organizations" TO app_rls
  USING (id = public.app_current_org())
  WITH CHECK (id = public.app_current_org());

-- 5. Users: only users that belong to the current organization ---------------
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "users" TO app_rls;
CREATE POLICY tenant_members ON "users" FOR SELECT TO app_rls
  USING (EXISTS (
    SELECT 1 FROM "memberships" m
    WHERE m.user_id = "users".id AND m.organization_id = public.app_current_org()
  ));

-- 6. Every table with organization_id --------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'memberships', 'invitations', 'privacy_notices', 'developments', 'units', 'campaigns',
    'leads', 'consent_records', 'activities', 'lead_stage_events', 'tasks',
    'whatsapp_messages', 'quotes'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_rls', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_rls
         USING (organization_id = public.app_current_org())
         WITH CHECK (organization_id = public.app_current_org())',
      t
    );
  END LOOP;
END
$$;
