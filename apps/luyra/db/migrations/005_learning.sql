-- Learning domain: read-only historical data migrated from Hengo's
-- Supabase project (dnzqgnejwyucenghugrb), scoped to the single real
-- account (henheang15@gmail.com). kori_scenarios and
-- kori_interview_questions are shared content, not personal data, so
-- they're copied in full and not scoped to a user.

-- 1. tables (no constraints yet, so creation order doesn't matter)
create table if not exists learning_vocab_cards (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  category text not null default 'General',
  term text not null,
  meaning text not null,
  pronunciation text,
  example text,
  example_translation text,
  difficulty_level text,
  tags text[] not null default '{}',
  mastery integer not null default 0,
  next_review timestamptz not null default now(),
  ease_factor real not null default 2.5,
  interval_days real not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_conversations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New conversation',
  conversation_type text not null default 'GENERAL',
  scenario_id text,
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_messages (
  id uuid not null default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null,
  role text not null check (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text not null,
  corrections text,
  tokens_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists learning_corrections (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  original_text text not null,
  corrected_text text not null,
  explanation text,
  grammar_points text[] not null default '{}',
  mastery integer not null default 0,
  next_review_date timestamptz not null default now(),
  ease_factor real not null default 2.5,
  interval_days real not null default 0,
  repetitions integer not null default 0,
  lapses integer not null default 0,
  created_at timestamptz not null default now(),
  source_feature text not null default 'manual_check',
  source_id text,
  error_category text,
  severity text check (severity = ANY (ARRAY['minor'::text, 'important'::text])),
  natural_version text,
  fingerprint text not null,
  occurrence_count integer not null default 1,
  last_seen_at timestamptz not null default now(),
  scenario_id text,
  scenario_category text check (scenario_category IS NULL OR (scenario_category = ANY (ARRAY['workplace'::text, 'daily'::text]))),
  english_meaning text,
  coach_review_count integer not null default 0,
  coach_mastered boolean not null default false
);

create table if not exists learning_daily_phrases (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  date date not null default CURRENT_DATE,
  phrase text not null,
  meaning text not null,
  romanization text,
  when_to_use text,
  formality text,
  similar_expressions jsonb not null default '[]',
  learned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists learning_listening_lessons (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  topic text not null,
  title text not null,
  level text not null default 'Beginner',
  lines jsonb not null default '[]',
  quiz jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists learning_listening_attempts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid not null,
  score integer not null,
  total integer not null,
  accuracy real not null,
  results jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists learning_reading_units (
  id text not null,
  user_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_reading_progress (
  user_id uuid not null,
  unit_id text not null,
  entry jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists learning_foundation_progress (
  user_id uuid not null,
  lesson_id text not null,
  track text not null check (track = ANY (ARRAY['survival'::text, 'alphabet'::text, 'grammar'::text])),
  completed boolean not null default false,
  progress integer not null default 0,
  attempts integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists learning_scenarios (
  id text not null,
  title text not null,
  category text not null,
  level text not null default 'Beginner',
  summary text not null default '',
  goal text not null default '',
  intro_message text,
  created_at timestamptz not null default now()
);

create table if not exists learning_scenario_sessions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  scenario_id text not null,
  conversation_id uuid,
  mission_item_id uuid,
  user_turn_count integer not null default 0,
  task_completed boolean not null default false,
  score integer check (score >= 0 AND score <= 100),
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists learning_skill_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  skill_code text not null,
  source_feature text not null,
  source_id text,
  score integer not null check (score >= 0 AND score <= 100),
  confidence numeric,
  difficulty text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists learning_skill_mastery (
  user_id uuid not null,
  skill_code text not null,
  mastery_score numeric not null default 0,
  recent_score numeric,
  attempt_count integer not null default 0,
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists learning_daily_missions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  mission_date date not null,
  title text not null,
  reason text not null,
  estimated_minutes integer not null default 0,
  focus_skill_codes text[] not null default '{}',
  context_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_daily_mission_items (
  id uuid not null default gen_random_uuid(),
  mission_id uuid not null,
  user_id uuid not null,
  item_type text not null check (item_type = ANY (ARRAY['vocab_review'::text, 'correction_review'::text, 'daily_phrase'::text, 'scenario'::text, 'listening'::text, 'interview'::text, 'phrase_review'::text])),
  title text not null,
  reason text not null,
  target_count integer not null default 1,
  reference_ids text[] not null default '{}',
  skill_codes text[] not null default '{}',
  estimated_minutes integer not null default 0,
  status text not null default 'pending' check (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])),
  progress_count integer not null default 0,
  completed_at timestamptz,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists learning_interview_scripts (
  user_id uuid not null,
  topic_id text not null,
  sections jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists learning_interview_script_versions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  topic_id text not null default 'weather',
  version_label text not null check (char_length(version_label) >= 1 AND char_length(version_label) <= 80),
  source_type text not null default 'user' check (source_type = ANY (ARRAY['user'::text, 'ai'::text, 'mentor'::text])),
  sections jsonb not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists learning_interview_questions (
  id uuid not null default gen_random_uuid(),
  created_by_user_id uuid,
  topic_id text not null default 'weather',
  slug text,
  question_ko text not null check (char_length(question_ko) >= 1 AND char_length(question_ko) <= 500),
  question_en text,
  sample_answer_ko text,
  sample_answer_en text,
  category text not null default 'topic_selection' check (category = ANY (ARRAY['topic_selection'::text, 'korean_summer'::text, 'cambodian_weather'::text, 'comparison'::text, 'daily_life'::text, 'health'::text, 'personal_experience'::text, 'swimming_pool'::text, 'seonyudo_park'::text, 'adaptation'::text, 'opinion'::text, 'unexpected_followup'::text])),
  difficulty text not null default 'normal' check (difficulty = ANY (ARRAY['beginner'::text, 'normal'::text, 'challenging'::text])),
  priority text not null default 'recommended' check (priority = ANY (ARRAY['must_practice'::text, 'recommended'::text, 'optional'::text])),
  keywords text[] not null default '{}',
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_interview_question_progress (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  question_id uuid not null,
  times_practiced integer not null default 0,
  avg_score numeric,
  last_score numeric,
  last_practiced_at timestamptz,
  status text not null default 'new' check (status = ANY (ARRAY['new'::text, 'practicing'::text, 'improving'::text, 'strong'::text])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_interview_answers (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  question_id uuid,
  session_type text not null check (session_type = ANY (ARRAY['speaking_drill'::text, 'listening_drill'::text, 'mock_interview'::text])),
  session_id text,
  question_ko text not null,
  answer_text text not null,
  answer_duration_seconds integer,
  confidence_self_score smallint check (confidence_self_score >= 1 AND confidence_self_score <= 5),
  scores jsonb not null default '{}',
  feedback text,
  corrected_answer text,
  natural_alternative text,
  tip text,
  created_at timestamptz not null default now()
);

create table if not exists learning_interview_attempts (
  id uuid not null,
  user_id uuid not null,
  mode text not null default 'practice' check (mode = ANY (ARRAY['practice'::text, 'exam'::text])),
  topic_id text not null,
  scores jsonb not null,
  overall numeric not null,
  summary text not null default '',
  advice jsonb not null default '[]',
  analytics jsonb,
  question_count integer not null default 0,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists learning_phrase_collections (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  source_key text,
  title_ko text not null,
  title_en text not null,
  description text,
  category text not null,
  seed_version integer not null default 1,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_phrase_cards (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  collection_id uuid not null,
  source_key text,
  category text not null,
  situation text not null,
  difficulty text not null default 'medium' check (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  question jsonb not null,
  question_variants jsonb not null default '[]',
  answers jsonb not null,
  usage_note text check (char_length(usage_note) <= 1000),
  vocabulary jsonb not null default '[]',
  tags text[] not null default '{}',
  position integer not null default 0,
  active boolean not null default true,
  is_user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_phrase_progress (
  user_id uuid not null,
  phrase_id uuid not null,
  state text not null default 'new' check (state = ANY (ARRAY['new'::text, 'learning'::text, 'mastered'::text])),
  repetitions integer not null default 0,
  interval_days integer not null default 0,
  ease_factor numeric not null default 2.5,
  lapses integer not null default 0,
  mastery integer not null default 0 check (mastery >= 0 AND mastery <= 100),
  attempt_count integer not null default 0,
  successful_count integer not null default 0,
  last_grade text check (last_grade = ANY (ARRAY['AGAIN'::text, 'HARD'::text, 'GOOD'::text, 'EASY'::text])),
  last_reviewed_at timestamptz,
  next_review_at timestamptz not null default now(),
  mastered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_phrase_attempts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  phrase_id uuid not null,
  practice_mode text not null check (practice_mode = ANY (ARRAY['learn'::text, 'listen'::text, 'speak'::text, 'review'::text])),
  input_method text not null check (input_method = ANY (ARRAY['voice'::text, 'text'::text, 'manual'::text])),
  transcript text check (char_length(transcript) <= 1000),
  feedback jsonb,
  hint_used boolean not null default false,
  transcript_revealed boolean not null default false,
  task_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists learning_voice_sessions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid,
  scenario_id text,
  practice_mode text not null default 'free',
  correction_policy text not null default 'balanced',
  learner_level text not null default 'BEGINNER',
  model text,
  status text not null default 'completed' check (status = ANY (ARRAY['active'::text, 'completed'::text, 'failed'::text])),
  user_turn_count integer not null default 0,
  assistant_turn_count integer not null default 0,
  approx_word_count integer not null default 0,
  important_mistake_count integer not null default 0,
  target_expressions text[] not null default '{}',
  scenario_completed boolean,
  summary jsonb not null default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0
);

create table if not exists learning_korean_practice_turns (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  turn_number integer not null check (turn_number >= 1 AND turn_number <= 20),
  tutor_message jsonb not null default '{}' check (jsonb_typeof(tutor_message) = 'object'::text),
  transcript_revealed boolean not null default false,
  hint_used boolean not null default false,
  task_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists learning_korean_speaking_attempts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  turn_id uuid not null,
  input_method text not null check (input_method = ANY (ARRAY['audio'::text, 'text'::text])),
  transcript text not null check (char_length(transcript) >= 1 AND char_length(transcript) <= 2000),
  feedback jsonb not null default '{}' check (jsonb_typeof(feedback) = 'object'::text),
  recording_duration_ms integer check (recording_duration_ms IS NULL OR recording_duration_ms >= 0 AND recording_duration_ms <= 300000),
  is_retry boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists learning_korean_coach_preferences (
  user_id uuid not null,
  level text not null default 'beginner' check (level = ANY (ARRAY['beginner'::text, 'lower-intermediate'::text, 'intermediate'::text])),
  main_goal text not null default 'workplace' check (main_goal = ANY (ARRAY['workplace'::text, 'daily-life'::text, 'presentation'::text, 'general'::text])),
  explanation_language text not null default 'English' check (explanation_language = 'English'::text),
  romanization_mode text not null default 'on-request' check (romanization_mode = ANY (ARRAY['always'::text, 'on-request'::text, 'never'::text])),
  default_speech_speed numeric not null default 0.75 check (default_speech_speed = ANY (ARRAY[0.75, 1::numeric, 1.25])),
  daily_practice_goal_minutes integer not null default 10 check (daily_practice_goal_minutes >= 5 AND daily_practice_goal_minutes <= 120),
  preferred_practice_duration_minutes integer not null default 10 check (preferred_practice_duration_minutes >= 5 AND preferred_practice_duration_minutes <= 60),
  correction_strictness text not null default 'balanced' check (correction_strictness = ANY (ARRAY['gentle'::text, 'balanced'::text, 'detailed'::text])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_achievements (
  user_id uuid not null,
  code text not null,
  unlocked_at timestamptz not null default now()
);

create table if not exists learning_daily_study_plans (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  study_date date not null,
  mode text not null default 'normal' check (mode = ANY (ARRAY['busy'::text, 'normal'::text, 'office'::text])),
  topic_key text not null,
  topic_label text not null,
  romanization_visible boolean not null default true,
  activities jsonb not null default '[]' check (jsonb_typeof(activities) = 'array'::text),
  content jsonb not null default '{}' check (jsonb_typeof(content) = 'object'::text),
  attempts jsonb not null default '[]' check (jsonb_typeof(attempts) = 'array'::text),
  reflection text not null default '',
  mission_result text not null default '',
  total_focus_seconds integer not null default 0 check (total_focus_seconds >= 0),
  speaking_seconds integer not null default 0 check (speaking_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. primary keys (all of them, before any foreign key references one)
alter table learning_vocab_cards add constraint learning_vocab_cards_pkey primary key (id);
alter table learning_conversations add constraint learning_conversations_pkey primary key (id);
alter table learning_messages add constraint learning_messages_pkey primary key (id);
alter table learning_corrections add constraint learning_corrections_pkey primary key (id);
alter table learning_daily_phrases add constraint learning_daily_phrases_pkey primary key (id);
alter table learning_listening_lessons add constraint learning_listening_lessons_pkey primary key (id);
alter table learning_listening_attempts add constraint learning_listening_attempts_pkey primary key (id);
alter table learning_reading_units add constraint learning_reading_units_pkey primary key (id,user_id);
alter table learning_reading_progress add constraint learning_reading_progress_pkey primary key (user_id,unit_id);
alter table learning_foundation_progress add constraint learning_foundation_progress_pkey primary key (user_id,lesson_id);
alter table learning_scenarios add constraint learning_scenarios_pkey primary key (id);
alter table learning_scenario_sessions add constraint learning_scenario_sessions_pkey primary key (id);
alter table learning_skill_events add constraint learning_skill_events_pkey primary key (id);
alter table learning_skill_mastery add constraint learning_skill_mastery_pkey primary key (user_id,skill_code);
alter table learning_daily_missions add constraint learning_daily_missions_pkey primary key (id);
alter table learning_daily_mission_items add constraint learning_daily_mission_items_pkey primary key (id);
alter table learning_interview_scripts add constraint learning_interview_scripts_pkey primary key (user_id,topic_id);
alter table learning_interview_script_versions add constraint learning_interview_script_versions_pkey primary key (id);
alter table learning_interview_questions add constraint learning_interview_questions_pkey primary key (id);
alter table learning_interview_question_progress add constraint learning_interview_question_progress_pkey primary key (id);
alter table learning_interview_answers add constraint learning_interview_answers_pkey primary key (id);
alter table learning_interview_attempts add constraint learning_interview_attempts_pkey primary key (id);
alter table learning_phrase_collections add constraint learning_phrase_collections_pkey primary key (id);
alter table learning_phrase_cards add constraint learning_phrase_cards_pkey primary key (id);
alter table learning_phrase_progress add constraint learning_phrase_progress_pkey primary key (user_id,phrase_id);
alter table learning_phrase_attempts add constraint learning_phrase_attempts_pkey primary key (id);
alter table learning_voice_sessions add constraint learning_voice_sessions_pkey primary key (id);
alter table learning_korean_practice_turns add constraint learning_korean_practice_turns_pkey primary key (id);
alter table learning_korean_speaking_attempts add constraint learning_korean_speaking_attempts_pkey primary key (id);
alter table learning_korean_coach_preferences add constraint learning_korean_coach_preferences_pkey primary key (user_id);
alter table learning_achievements add constraint learning_achievements_pkey primary key (user_id,code);
alter table learning_daily_study_plans add constraint learning_daily_study_plans_pkey primary key (id);

-- 3. foreign keys (every referenced primary key now exists)
alter table learning_vocab_cards add constraint learning_vocab_cards_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_conversations add constraint learning_conversations_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_messages add constraint learning_messages_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_messages add constraint learning_messages_conversation_id_fkey foreign key (conversation_id) references learning_conversations(id);
alter table learning_corrections add constraint learning_corrections_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_daily_phrases add constraint learning_daily_phrases_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_listening_lessons add constraint learning_listening_lessons_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_listening_attempts add constraint learning_listening_attempts_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_listening_attempts add constraint learning_listening_attempts_lesson_id_fkey foreign key (lesson_id) references learning_listening_lessons(id);
alter table learning_reading_units add constraint learning_reading_units_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_reading_progress add constraint learning_reading_progress_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_foundation_progress add constraint learning_foundation_progress_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_scenario_sessions add constraint learning_scenario_sessions_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_scenario_sessions add constraint learning_scenario_sessions_conversation_id_fkey foreign key (conversation_id) references learning_conversations(id);
alter table learning_scenario_sessions add constraint learning_scenario_sessions_mission_item_id_fkey foreign key (mission_item_id) references learning_daily_mission_items(id);
alter table learning_skill_events add constraint learning_skill_events_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_skill_mastery add constraint learning_skill_mastery_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_daily_missions add constraint learning_daily_missions_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_daily_mission_items add constraint learning_daily_mission_items_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_daily_mission_items add constraint learning_daily_mission_items_mission_id_fkey foreign key (mission_id) references learning_daily_missions(id);
alter table learning_interview_scripts add constraint learning_interview_scripts_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_interview_script_versions add constraint learning_interview_script_versions_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_interview_question_progress add constraint learning_interview_question_progress_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_interview_question_progress add constraint learning_interview_question_progress_question_id_fkey foreign key (question_id) references learning_interview_questions(id);
alter table learning_interview_answers add constraint learning_interview_answers_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_interview_answers add constraint learning_interview_answers_question_id_fkey foreign key (question_id) references learning_interview_questions(id);
alter table learning_interview_attempts add constraint learning_interview_attempts_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_phrase_collections add constraint learning_phrase_collections_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_phrase_cards add constraint learning_phrase_cards_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_phrase_cards add constraint learning_phrase_cards_collection_id_fkey foreign key (collection_id) references learning_phrase_collections(id);
alter table learning_phrase_progress add constraint learning_phrase_progress_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_phrase_progress add constraint learning_phrase_progress_phrase_id_fkey foreign key (phrase_id) references learning_phrase_cards(id);
alter table learning_phrase_attempts add constraint learning_phrase_attempts_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_phrase_attempts add constraint learning_phrase_attempts_phrase_id_fkey foreign key (phrase_id) references learning_phrase_cards(id);
alter table learning_voice_sessions add constraint learning_voice_sessions_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_voice_sessions add constraint learning_voice_sessions_conversation_id_fkey foreign key (conversation_id) references learning_conversations(id);
alter table learning_korean_practice_turns add constraint learning_korean_practice_turns_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_korean_practice_turns add constraint learning_korean_practice_turns_session_id_fkey foreign key (session_id) references learning_voice_sessions(id);
alter table learning_korean_speaking_attempts add constraint learning_korean_speaking_attempts_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_korean_speaking_attempts add constraint learning_korean_speaking_attempts_session_id_fkey foreign key (session_id) references learning_voice_sessions(id);
alter table learning_korean_speaking_attempts add constraint learning_korean_speaking_attempts_turn_id_fkey foreign key (turn_id) references learning_korean_practice_turns(id);
alter table learning_korean_coach_preferences add constraint learning_korean_coach_preferences_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_achievements add constraint learning_achievements_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table learning_daily_study_plans add constraint learning_daily_study_plans_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

-- 4. indexes
create index if not exists learning_vocab_cards_user_id_idx on learning_vocab_cards (user_id);
create index if not exists learning_conversations_user_id_idx on learning_conversations (user_id);
create index if not exists learning_messages_user_id_idx on learning_messages (user_id);
create index if not exists learning_corrections_user_id_idx on learning_corrections (user_id);
create index if not exists learning_daily_phrases_user_id_idx on learning_daily_phrases (user_id);
create index if not exists learning_listening_lessons_user_id_idx on learning_listening_lessons (user_id);
create index if not exists learning_listening_attempts_user_id_idx on learning_listening_attempts (user_id);
create index if not exists learning_reading_units_user_id_idx on learning_reading_units (user_id);
create index if not exists learning_reading_progress_user_id_idx on learning_reading_progress (user_id);
create index if not exists learning_foundation_progress_user_id_idx on learning_foundation_progress (user_id);
create index if not exists learning_scenario_sessions_user_id_idx on learning_scenario_sessions (user_id);
create index if not exists learning_skill_events_user_id_idx on learning_skill_events (user_id);
create index if not exists learning_skill_mastery_user_id_idx on learning_skill_mastery (user_id);
create index if not exists learning_daily_missions_user_id_idx on learning_daily_missions (user_id);
create index if not exists learning_daily_mission_items_user_id_idx on learning_daily_mission_items (user_id);
create index if not exists learning_interview_scripts_user_id_idx on learning_interview_scripts (user_id);
create index if not exists learning_interview_script_versions_user_id_idx on learning_interview_script_versions (user_id);
create index if not exists learning_interview_question_progress_user_id_idx on learning_interview_question_progress (user_id);
create index if not exists learning_interview_answers_user_id_idx on learning_interview_answers (user_id);
create index if not exists learning_interview_attempts_user_id_idx on learning_interview_attempts (user_id);
create index if not exists learning_phrase_collections_user_id_idx on learning_phrase_collections (user_id);
create index if not exists learning_phrase_cards_user_id_idx on learning_phrase_cards (user_id);
create index if not exists learning_phrase_progress_user_id_idx on learning_phrase_progress (user_id);
create index if not exists learning_phrase_attempts_user_id_idx on learning_phrase_attempts (user_id);
create index if not exists learning_voice_sessions_user_id_idx on learning_voice_sessions (user_id);
create index if not exists learning_korean_practice_turns_user_id_idx on learning_korean_practice_turns (user_id);
create index if not exists learning_korean_speaking_attempts_user_id_idx on learning_korean_speaking_attempts (user_id);
create index if not exists learning_korean_coach_preferences_user_id_idx on learning_korean_coach_preferences (user_id);
create index if not exists learning_achievements_user_id_idx on learning_achievements (user_id);
create index if not exists learning_daily_study_plans_user_id_idx on learning_daily_study_plans (user_id);
