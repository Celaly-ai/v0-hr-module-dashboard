-- 007_live_pilot_add_ik_role.sql
-- Live pilot role enum patch. Safe to re-run.
-- Run this before 008_live_pilot_role_permissions_patch.sql.

alter type public.app_role add value if not exists 'ik_yoneticisi';
