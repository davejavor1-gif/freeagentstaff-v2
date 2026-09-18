-- protect_billing_state() is SECURITY DEFINER owned by postgres, so current_user inside
-- the trigger is always postgres and cannot identify an authenticated client.
-- Use current_setting('role') (SET ROLE from PostgREST) to freeze billing fields for
-- ordinary clients while still allowing service_role and postgres writers.

create or replace function public.protect_billing_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := coalesce(nullif(current_setting('role', true), ''), current_user);
begin
  if v_role not in ('service_role', 'postgres') then
    if tg_op = 'INSERT' then
      new.talent_plan := 'free_agent';
      new.talent_subscription_status := 'inactive';
      new.talent_subscription_current_period_ends_at := null;
      new.talent_subscription_cancel_at := null;
      new.talent_subscription_cancel_at_period_end := false;
      new.stripe_customer_id := null;
      new.stripe_talent_subscription_id := null;
      new.stripe_talent_price_id := null;
      new.employer_subscription_status := 'inactive';
      new.employer_subscription_current_period_ends_at := null;
      new.employer_subscription_cancel_at_period_end := false;
      new.stripe_employer_subscription_id := null;
      new.stripe_employer_price_id := null;
      new.short_stay_access_expires_at := null;
      new.stripe_short_stay_payment_intent_id := null;
      new.stripe_short_stay_checkout_session_id := null;
    else
      new.talent_plan := old.talent_plan;
      new.talent_subscription_status := old.talent_subscription_status;
      new.talent_subscription_current_period_ends_at := old.talent_subscription_current_period_ends_at;
      new.talent_subscription_cancel_at := old.talent_subscription_cancel_at;
      new.talent_subscription_cancel_at_period_end := old.talent_subscription_cancel_at_period_end;
      new.stripe_customer_id := old.stripe_customer_id;
      new.stripe_talent_subscription_id := old.stripe_talent_subscription_id;
      new.stripe_talent_price_id := old.stripe_talent_price_id;
      new.employer_subscription_status := old.employer_subscription_status;
      new.employer_subscription_current_period_ends_at := old.employer_subscription_current_period_ends_at;
      new.employer_subscription_cancel_at_period_end := old.employer_subscription_cancel_at_period_end;
      new.stripe_employer_subscription_id := old.stripe_employer_subscription_id;
      new.stripe_employer_price_id := old.stripe_employer_price_id;
      new.short_stay_access_expires_at := old.short_stay_access_expires_at;
      new.stripe_short_stay_payment_intent_id := old.stripe_short_stay_payment_intent_id;
      new.stripe_short_stay_checkout_session_id := old.stripe_short_stay_checkout_session_id;
    end if;
  end if;

  return new;
end;
$$;
