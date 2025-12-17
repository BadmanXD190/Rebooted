product_name: Rebooted Mobile App
version: 1.0
last_updated: 2025-12-08

overview:
  description: >
    Rebooted is a productivity mobile app that helps students and young 
    professionals overcome procrastination by breaking complex tasks into 
    structured work packages and scheduling realistic focus sessions using AI.
  core_features:
    - AI task decomposition
    - AI scheduling and optimization
    - Personalized user preferences
    - Focus session timer
    - Daily and weekly planner
  platforms:
    - Mobile (Expo + React Native)
  backend:
    - Node API (decompose & schedule)
    - Supabase database & auth

problem_statement: >
  Users struggle to convert vague tasks into actionable steps. They often feel 
  overwhelmed, underestimate required time, and have no clear schedule. This leads 
  to procrastination and low productivity. Rebooted solves this by automating 
  breakdown and scheduling.

target_users:
  - university_students
  - early_career_professionals
  - individuals_with_procrastination_patterns
  - productivity_enthusiasts

goals:
  primary:
    - Convert vague tasks into actionable, structured tasks
    - Provide realistic schedules that fit user availability
    - Help users stay consistent with focus sessions
    - Reduce overwhelm by clarifying next steps
  secondary:
    - Improve task time estimates using user learning engine
    - Allow flexible manual task editing
    - Provide daily progress insights

scope:
  in_scope:
    - Supabase auth
    - Create project using AI decomposition
    - Display tasks grouped by phase/work_package
    - AI scheduling and weekly view
    - Focus timer
    - Task editing (status)
    - User preferences
    - Availability editor
  out_of_scope:
    - Offline mode
    - Real-time collaboration
    - Predictive analytics
    - Calendar sync
    - Push notifications (future plan)

success_metrics:
  - user_creates_project_within_10_minutes: true
  - user_completes_at_least_one_focus_session: true
  - 70_percent_users_generate_schedule: true
  - daily_active_users_increase_during_peak_periods: true

requirements:
  functional:
    - ai_task_decomposition
    - ai_scheduling
    - supabase_data_persistence
    - hierarchical_task_display
    - scheduling_view
    - focus_timer
    - task_status_update
  non_functional:
    - load_home_under_two_seconds
    - clear_error_messages
    - react_query_caching
    - secure_auth_storage
