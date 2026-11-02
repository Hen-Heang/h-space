-- Swap the shared K-Specialist question bank to the 제6회 topic
-- "한국에 온 후 새로 생긴 습관/취미".
--
-- The bank still held the previous summer-weather questions, so the Script
-- page's Q&A tab and the speaking drills showed questions for the old topic.
-- The topic id stays 'weather' (it is stored in scripts, versions and
-- progress), only its questions change.
--
-- 1. Deactivate (not delete) the old shared questions, so any practice
--    progress or answer history that points at them keeps its row and the
--    change is reversible: set active = true on them again.
-- 2. Upsert the 21 habits questions. Text comes from HABITS_MODEL_QUESTIONS in
--    lib/interview.ts (formal -습니다 answers); lib/interview-content.test.ts
--    fails if the two drift apart. Re-runnable: existing slugs are updated.
--
-- User-owned questions (created_by_user_id is not null) are never touched.

update public.kori_interview_questions
set active = false,
    updated_at = now()
where topic_id = 'weather'
  and created_by_user_id is null
  and active
  and (slug is null or slug not like 'habits-%');

insert into public.kori_interview_questions
  (slug, topic_id, question_ko, question_en, sample_answer_ko, sample_answer_en, category, difficulty, priority, keywords, display_order)
values
  (
    'habits-why-topic', 'weather',
    '왜 이 주제를 선택했어요?',
    'Why did you choose this topic?',
    '한국에 온 후 제 생활이 많이 달라졌기 때문입니다. 새로 생긴 습관과 취미가 많아서 이 주제를 선택했습니다.',
    'Because my life changed a lot after coming to Korea. I chose this topic because I have many new habits and hobbies.',
    'topic_selection', 'beginner', 'must_practice',
    array['생활', '달라지다', '습관과 취미'], 1
  ),
  (
    'habits-new-habits', 'weather',
    '한국에 온 후 새로 생긴 습관은 뭐예요?',
    'What new habits did you develop after coming to Korea?',
    '걸어서 출근하고, 날씨를 확인하고, 쓰레기를 분리배출하는 습관이 생겼습니다.',
    'I got into the habits of walking to work, checking the weather, and separating my trash.',
    'daily_life', 'beginner', 'must_practice',
    array['걸어서 출근', '날씨 확인', '분리배출'], 2
  ),
  (
    'habits-transport-change', 'weather',
    '캄보디아에 있을 때와 교통 습관이 어떻게 달라졌어요?',
    'How have your transportation habits changed since Cambodia?',
    '캄보디아에서는 오토바이나 차를 많이 이용했습니다. 한국에서는 걸어서 출근하고, 멀리 갈 때는 버스나 지하철을 이용합니다.',
    'In Cambodia, I used a motorbike or a car a lot. In Korea, I walk to work, and when I go far, I take the bus or subway.',
    'comparison', 'normal', 'must_practice',
    array['오토바이', '걸어서', '지하철'], 3
  ),
  (
    'habits-first-subway', 'weather',
    '지하철을 처음 이용했을 때 어땠어요?',
    'What was it like when you first used the subway?',
    '처음에는 노선과 환승이 어려웠습니다. 하지만 지금은 혼자서도 서울의 여러 곳에 갈 수 있습니다.',
    'At first, the lines and transfers were difficult. But now I can go to many places in Seoul by myself.',
    'adaptation', 'beginner', 'recommended',
    array['노선', '환승', '혼자서도'], 4
  ),
  (
    'habits-weather-check', 'weather',
    '왜 밖에 나가기 전에 날씨를 확인해요?',
    'Why do you check the weather before going out?',
    '한국은 계절에 따라 날씨 변화가 크기 때문입니다. 그래서 우산이나 옷을 미리 준비합니다.',
    'Because the weather in Korea changes a lot with the seasons. So I prepare an umbrella or clothes in advance.',
    'daily_life', 'beginner', 'recommended',
    array['계절', '날씨 변화', '미리 준비'], 5
  ),
  (
    'habits-recycling', 'weather',
    '쓰레기 버리는 습관은 어떻게 달라졌어요?',
    'How did your habit of throwing away trash change?',
    '예전에는 많이 나누지 않았습니다. 지금은 음식물 쓰레기와 재활용을 확인해서 따로 버립니다.',
    'Before, I didn''t separate it much. Now I check food waste and recycling separately before throwing them away.',
    'adaptation', 'normal', 'recommended',
    array['음식물 쓰레기', '재활용', '따로'], 6
  ),
  (
    'habits-cooking', 'weather',
    '한국에 와서 요리를 자주 해요?',
    'Do you cook often since coming to Korea?',
    '네, 처음에는 한국 음식에 익숙하지 않아서 직접 요리를 시작했습니다. 지금은 김치찌개도 만들 수 있습니다.',
    'Yes. At first I wasn''t used to Korean food, so I started cooking for myself. Now I can even make kimchi stew.',
    'daily_life', 'beginner', 'recommended',
    array['익숙하지 않다', '직접 요리', '김치찌개'], 7
  ),
  (
    'habits-new-hobby', 'weather',
    '한국에 온 후 새로 생긴 취미는 뭐예요?',
    'What new hobbies did you pick up after coming to Korea?',
    '산책, 조깅, 자전거 타기를 더 자주 하게 되었습니다. 가끔 수영도 합니다.',
    'I started walking, jogging, and cycling more often. Sometimes I also swim.',
    'personal_experience', 'beginner', 'must_practice',
    array['산책', '조깅', '자전거'], 8
  ),
  (
    'habits-why-walking', 'weather',
    '왜 산책을 자주 하게 되었어요?',
    'Why did you start walking often?',
    '건강에도 좋고, 스트레스도 줄일 수 있어서 시작했습니다.',
    'I started because it''s good for my health and it reduces stress.',
    'personal_experience', 'beginner', 'must_practice',
    array['건강', '스트레스', '시작하다'], 9
  ),
  (
    'habits-where-exercise', 'weather',
    '어디에서 자주 운동해요?',
    'Where do you usually exercise?',
    '퇴근 후나 주말에 여의도공원에서 걷거나 조깅을 합니다. 한강에서는 자전거를 탑니다.',
    'After work or on weekends, I walk or jog at Yeouido Park. I ride a bicycle along the Han River.',
    'personal_experience', 'beginner', 'recommended',
    array['여의도공원', '퇴근 후', '한강'], 10
  ),
  (
    'habits-han-river-cycling', 'weather',
    '왜 한강에서 자전거 타는 것을 좋아해요?',
    'Why do you like riding a bicycle along the Han River?',
    '경치가 좋고 기분이 상쾌하기 때문입니다. 그래서 시간이 있으면 자전거를 타러 갑니다.',
    'The scenery is nice and I feel refreshed. So when I have time, I go cycling.',
    'personal_experience', 'normal', 'recommended',
    array['경치', '상쾌하다', '시간이 있으면'], 11
  ),
  (
    'habits-after-exercise', 'weather',
    '운동을 하고 나면 기분이 어때요?',
    'How do you feel after exercising?',
    '기분이 상쾌하고 스트레스도 줄어드는 것 같습니다.',
    'I feel refreshed, and my stress seems to go down.',
    'personal_experience', 'beginner', 'optional',
    array['상쾌하다', '스트레스', '줄어들다'], 12
  ),
  (
    'habits-weekend', 'weather',
    '주말에는 보통 뭐 해요?',
    'What do you usually do on weekends?',
    '공원에서 산책하거나 새로운 곳을 구경합니다. 가끔 사진도 찍습니다.',
    'I go to the park or look around new places. Sometimes I also take photos.',
    'daily_life', 'beginner', 'must_practice',
    array['공원', '새로운 곳', '사진'], 13
  ),
  (
    'habits-new-friends', 'weather',
    '한국에서 새로운 친구를 만났어요?',
    'Have you made new friends in Korea?',
    '네, 한국에 사는 캄보디아 친구들을 새로 만났습니다. 쉬는 날에는 같이 새로운 곳에 가기도 합니다.',
    'Yes, I met new Cambodian friends who live in Korea. On days off, we sometimes go to new places together.',
    'personal_experience', 'beginner', 'recommended',
    array['캄보디아 친구', '쉬는 날', '새로운 곳'], 14
  ),
  (
    'habits-places-with-friends', 'weather',
    '친구들과 어디에 가 봤어요?',
    'Where have you been with your friends?',
    '올해 설날에 친구들과 수원에 갔습니다. 화성행궁을 구경하고 캄보디아 식당에서 놈반쪽도 먹었습니다.',
    'This Seollal, I went to Suwon with friends. We looked around Hwaseong Haenggung and ate nom banh chok at a Cambodian restaurant.',
    'personal_experience', 'normal', 'recommended',
    array['설날', '수원', '화성행궁'], 15
  ),
  (
    'habits-korean-study-habit', 'weather',
    '한국어 공부도 습관이 되었어요?',
    'Has studying Korean become a habit too?',
    '네, 회사와 일상생활에서 필요해서 매일 조금씩 공부하고 있습니다.',
    'Yes, I need it at work and in daily life, so I study a little every day.',
    'adaptation', 'beginner', 'recommended',
    array['회사', '일상생활', '매일 조금씩'], 16
  ),
  (
    'habits-how-study-korean', 'weather',
    '한국어 공부는 어떻게 하고 있어요?',
    'How are you studying Korean?',
    '매일 조금씩 공부하고, 회사에서는 한국어 문서를 읽거나 동료들의 말을 이해하려고 노력합니다.',
    'I study a little every day, and at work I try to read Korean documents and understand my coworkers.',
    'adaptation', 'normal', 'must_practice',
    array['매일 조금씩', '한국어 문서', '동료'], 17
  ),
  (
    'habits-hardest-korean', 'weather',
    '한국어에서 가장 어려운 것은 뭐예요?',
    'What is the hardest thing about Korean?',
    '저는 듣기와 말하기가 가장 어렵습니다. 하지만 지금은 예전보다 조금 더 잘 이해할 수 있게 되었습니다.',
    'Listening and speaking are the hardest for me. But now I can understand a little more than before.',
    'opinion', 'normal', 'recommended',
    array['듣기', '말하기', '예전보다'], 18
  ),
  (
    'habits-biggest-change', 'weather',
    '한국에 와서 가장 많이 달라진 점은 뭐예요?',
    'What has changed the most since you came to Korea?',
    '혼자 할 수 있는 일이 많아졌습니다. 그리고 한국 생활에도 더 잘 적응하게 되었습니다.',
    'I can do many more things by myself, and I have adapted better to life in Korea.',
    'opinion', 'challenging', 'recommended',
    array['혼자', '많아지다', '적응하다'], 19
  ),
  (
    'habits-best-habit', 'weather',
    '이 습관 중에서 가장 좋은 습관은 뭐예요?',
    'Which of these habits is the best one?',
    '운동하는 습관이 가장 좋다고 생각합니다. 건강에도 좋고 기분 전환도 됩니다.',
    'I think exercising is the best habit. It''s good for my health and refreshes my mood.',
    'opinion', 'challenging', 'optional',
    array['운동', '건강', '기분 전환'], 20
  ),
  (
    'habits-keep-habits', 'weather',
    '앞으로 계속 유지하고 싶은 습관은 뭐예요?',
    'Which habits do you want to keep in the future?',
    '운동과 한국어 공부를 계속하고 싶습니다. 둘 다 제 생활에 도움이 됩니다.',
    'I want to keep exercising and studying Korean. Both help my life.',
    'opinion', 'normal', 'recommended',
    array['운동', '한국어 공부', '유지하다'], 21
  )
on conflict (slug) do update
set question_ko = excluded.question_ko,
    question_en = excluded.question_en,
    sample_answer_ko = excluded.sample_answer_ko,
    sample_answer_en = excluded.sample_answer_en,
    category = excluded.category,
    difficulty = excluded.difficulty,
    priority = excluded.priority,
    keywords = excluded.keywords,
    display_order = excluded.display_order,
    active = true,
    updated_at = now();
