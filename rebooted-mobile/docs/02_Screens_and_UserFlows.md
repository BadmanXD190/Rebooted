screens:
  - id: login
    name: Login / Register
    purpose: Authenticate via Supabase email/password

  - id: home
    name: Home (Today View)
    purpose: Display today's scheduled focus sessions

  - id: projects
    name: Projects List
    purpose: Show user's projects with progress indicators

  - id: create_project
    name: Create Project
    purpose: Submit text for AI decomposition

  - id: project_detail
    name: Project Detail
    purpose: Show phases, work packages, tasks; edit task status

  - id: schedule_view
    name: Weekly Schedule
    purpose: Show schedule blocks grouped by day

  - id: focus_timer
    name: Focus Session Timer
    purpose: Run countdown for a scheduled block

  - id: settings
    name: Settings
    purpose: Edit user preferences

  - id: availability_editor
    name: Weekly Availability Editor
    purpose: Configure user's available hours and deep focus times


user_flows:

  - flow: authentication
    steps:
      - launch_app
      - show_login_screen
      - user_enters_credentials
      - supabase_authenticates
      - redirect_home_if_success

  - flow: create_project_with_ai
    steps:
      - user_clicks_new_project
      - user_enters_text_description
      - user_taps_generate_plan
      - call_post_decompose
      - backend_creates_project_and_tasks
      - navigate_to_project_detail

  - flow: review_edit_tasks
    steps:
      - load_project_detail
      - display_phases_and_work_packages
      - user_taps_task
      - user_updates_task_status
      - save_to_supabase

  - flow: generate_schedule
    steps:
      - user_taps_generate_schedule
      - client_calls_post_schedule
      - backend_creates_schedule_blocks
      - navigate_to_schedule_view

  - flow: view_today_home
    steps:
      - load_today_date
      - fetch_schedule_blocks
      - display_list_or_empty_state

  - flow: start_focus_session
    steps:
      - user_taps_schedule_block
      - open_focus_timer
      - run_timer
      - user_taps_finish
      - update_task_status

  - flow: edit_user_preferences
    steps:
      - open_settings
      - load_preferences
      - user_edits_values
      - save_to_supabase

  - flow: edit_availability
    steps:
      - open_availability_editor
      - show_weekday_rows
      - edit_start_end_times
      - toggle_deep_focus
      - save_to_supabase


wireframes:
  home:
    layout: |
      Header: Greeting
      Section: Today's Focus Sessions
      List: schedule_blocks

  projects:
    layout: |
      Header: Projects
      FloatingButton: New Project
      List: Project cards with progress

  project_detail:
    layout: |
      Section per phase
      Section per work package
      List of tasks

  schedule_view:
    layout: |
      Horizontal weekday selector
      Vertical list of blocks for selected day

  focus_timer:
    layout: |
      Header: Task name
      Large countdown timer
      Buttons: Start / Finish
