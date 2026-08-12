begin;

with normalized as (
  select
    p.user_id,
    nullif(btrim(coalesce(p.profile ->> 'name', '')), '') as json_name,
    nullif(btrim(coalesce(p.profile ->> 'title', '')), '') as json_title,
    nullif(btrim(coalesce(p.profile ->> 'location', '')), '') as json_location,
    case
      when p.profile ->> 'availability' in (
        'Available Now',
        'Open to Opportunities',
        'Open to new projects',
        'Busy this month',
        'Booked'
      ) then p.profile ->> 'availability'
      else null
    end as json_availability,
    nullif(btrim(coalesce(p.profile ->> 'topStrength', '')), '') as json_top_strength,
    case
      when jsonb_typeof(p.profile -> 'experienceYears') = 'number'
        then greatest(0, floor((p.profile ->> 'experienceYears')::numeric))::integer
      else null
    end as json_experience_years,
    nullif(btrim(coalesce(p.profile ->> 'focusArea', '')), '') as json_focus_area,
    nullif(btrim(coalesce(p.profile ->> 'summary', '')), '') as json_summary,
    nullif(btrim(coalesce(p.profile ->> 'currentEmployer', '')), '') as json_current_employer,
    nullif(btrim(coalesce(p.profile ->> 'imageAlt', '')), '') as json_image_alt,
    nullif(btrim(coalesce(u.email, '')), '') as auth_email,
    nullif(btrim(coalesce(p.profile ->> 'email', '')), '') as json_email,
    case
      when jsonb_typeof(p.profile -> 'skills') = 'array' then (
        select coalesce(array_agg(skill), '{}'::text[])
        from (
          select distinct btrim(value) as skill
          from jsonb_array_elements_text(p.profile -> 'skills') as raw(value)
          where btrim(value) <> ''
        ) deduped
      )
      else null
    end as json_skills,
    case
      when jsonb_typeof(p.profile -> 'careerJourney') = 'array' then p.profile -> 'careerJourney'
      else null
    end as json_career_journey
  from public.profiles p
  left join auth.users u
    on u.id = p.user_id
  where p.account_type = 'talent'
)
update public.profiles p
set
  name = coalesce(nullif(btrim(coalesce(p.name, '')), ''), n.json_name),
  title = coalesce(nullif(btrim(coalesce(p.title, '')), ''), n.json_title),
  location = coalesce(nullif(btrim(coalesce(p.location, '')), ''), n.json_location),
  availability = coalesce(nullif(btrim(coalesce(p.availability, '')), ''), n.json_availability),
  top_strength = coalesce(nullif(btrim(coalesce(p.top_strength, '')), ''), n.json_top_strength),
  experience_years = case
    when p.experience_years = 0 and n.json_experience_years is not null then n.json_experience_years
    else p.experience_years
  end,
  focus_area = coalesce(nullif(btrim(coalesce(p.focus_area, '')), ''), n.json_focus_area),
  summary = coalesce(nullif(btrim(coalesce(p.summary, '')), ''), n.json_summary),
  skills = case
    when coalesce(array_length(p.skills, 1), 0) = 0 and n.json_skills is not null then n.json_skills
    else p.skills
  end,
  career_journey = case
    when jsonb_typeof(p.career_journey) = 'array'
      and jsonb_array_length(p.career_journey) = 0
      and n.json_career_journey is not null
      then n.json_career_journey
    else p.career_journey
  end,
  email = coalesce(nullif(btrim(coalesce(p.email, '')), ''), n.auth_email, n.json_email),
  image_alt = coalesce(nullif(btrim(coalesce(p.image_alt, '')), ''), n.json_image_alt),
  current_employer = coalesce(nullif(btrim(coalesce(p.current_employer, '')), ''), n.json_current_employer)
from normalized n
where p.user_id = n.user_id
  and (
    (nullif(btrim(coalesce(p.name, '')), '') is null and n.json_name is not null)
    or (nullif(btrim(coalesce(p.title, '')), '') is null and n.json_title is not null)
    or (nullif(btrim(coalesce(p.location, '')), '') is null and n.json_location is not null)
    or (nullif(btrim(coalesce(p.availability, '')), '') is null and n.json_availability is not null)
    or (nullif(btrim(coalesce(p.top_strength, '')), '') is null and n.json_top_strength is not null)
    or (p.experience_years = 0 and n.json_experience_years is not null)
    or (nullif(btrim(coalesce(p.focus_area, '')), '') is null and n.json_focus_area is not null)
    or (nullif(btrim(coalesce(p.summary, '')), '') is null and n.json_summary is not null)
    or (coalesce(array_length(p.skills, 1), 0) = 0 and n.json_skills is not null)
    or (
      jsonb_typeof(p.career_journey) = 'array'
      and jsonb_array_length(p.career_journey) = 0
      and n.json_career_journey is not null
    )
    or (nullif(btrim(coalesce(p.email, '')), '') is null and coalesce(n.auth_email, n.json_email) is not null)
    or (nullif(btrim(coalesce(p.image_alt, '')), '') is null and n.json_image_alt is not null)
    or (nullif(btrim(coalesce(p.current_employer, '')), '') is null and n.json_current_employer is not null)
  );

commit;