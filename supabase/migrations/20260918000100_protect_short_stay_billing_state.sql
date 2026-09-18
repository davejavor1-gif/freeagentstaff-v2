-- Prevent authenticated clients from self-granting or mutating Short Stay entitlement.
-- Trusted writers remain service_role and postgres (Stripe webhook / server).

create or replace function public.protect_billing_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('service_role', 'postgres') then
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
