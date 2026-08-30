-- The Edge Function authenticates the admin user, then invokes these routines
-- through its private service-role client. Keep direct RPC execution disabled
-- for browser roles.
revoke all on function public.apply_import_batch(uuid) from public, anon, authenticated;
revoke all on function public.rollback_import_batch(uuid) from public, anon, authenticated;

grant execute on function public.apply_import_batch(uuid) to service_role;
grant execute on function public.rollback_import_batch(uuid) to service_role;

grant insert, update, delete on table public.booking_history to service_role;
grant insert, update, delete on table public.platform_finance_ledger to service_role;

grant usage on sequence public.booking_history_id_seq to service_role;
grant usage on sequence public.platform_finance_ledger_id_seq to service_role;
grant usage on sequence public.import_changes_id_seq to service_role;
