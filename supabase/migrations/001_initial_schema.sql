-- Rebooted Database Schema Migration
-- Creates enums, tables, indexes, constraints, and RLS policies

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE points_reason AS ENUM ('task_time', 'petting', 'feeding');
CREATE TYPE project_type AS ENUM ('work', 'study', 'life');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. user_preferences
CREATE TABLE user_preferences (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tasks_per_day int NOT NULL DEFAULT 3 CHECK (tasks_per_day >= 1 AND tasks_per_day <= 20),
    wake_time time NOT NULL DEFAULT '07:00',
    sleep_time time NOT NULL DEFAULT '23:00',
    type_priority_order text[] NOT NULL DEFAULT ARRAY['work', 'study', 'life'],
    active_days text[] NOT NULL DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. projects
CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    due_date date,
    priority int NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    project_type project_type NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. tasks
CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    order_index int NOT NULL CHECK (order_index >= 1),
    title text NOT NULL,
    subtasks_text text NOT NULL DEFAULT '',
    status task_status NOT NULL DEFAULT 'pending',
    total_minutes int NOT NULL DEFAULT 0 CHECK (total_minutes >= 0),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, order_index)
);

-- 4. daily_task_assignments
CREATE TABLE daily_task_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, date, task_id)
);

-- Add unique constraint on task_id to ensure task can only be assigned to one day
CREATE UNIQUE INDEX daily_task_assignments_task_id_unique ON daily_task_assignments(task_id) WHERE task_id IS NOT NULL;

-- 5. task_sessions
CREATE TABLE task_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    duration_minutes int NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. points_ledger
CREATE TABLE points_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
    delta_points int NOT NULL,
    reason points_reason NOT NULL,
    ref_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. pet_state
CREATE TABLE pet_state (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_level int NOT NULL DEFAULT 1 CHECK (pet_level >= 1),
    pet_xp int NOT NULL DEFAULT 0 CHECK (pet_xp >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes for common queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_due_date ON projects(due_date);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_daily_task_assignments_user_date ON daily_task_assignments(user_id, date);
CREATE INDEX idx_daily_task_assignments_task_id ON daily_task_assignments(task_id);
CREATE INDEX idx_task_sessions_user_id ON task_sessions(user_id);
CREATE INDEX idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX idx_points_ledger_date ON points_ledger(date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_state ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- user_preferences policies
CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- projects policies
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- tasks policies
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- daily_task_assignments policies
CREATE POLICY "Users can view their own assignments"
    ON daily_task_assignments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert assignments for their own tasks"
    ON daily_task_assignments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = daily_task_assignments.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own assignments"
    ON daily_task_assignments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = daily_task_assignments.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own assignments"
    ON daily_task_assignments FOR DELETE
    USING (auth.uid() = user_id);

-- task_sessions policies
CREATE POLICY "Users can view their own sessions"
    ON task_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
    ON task_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON task_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON task_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- points_ledger policies
CREATE POLICY "Users can view their own points"
    ON points_ledger FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points"
    ON points_ledger FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own points"
    ON points_ledger FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own points"
    ON points_ledger FOR DELETE
    USING (auth.uid() = user_id);

-- pet_state policies
CREATE POLICY "Users can view their own pet state"
    ON pet_state FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pet state"
    ON pet_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pet state"
    ON pet_state FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pet state"
    ON pet_state FOR DELETE
    USING (auth.uid() = user_id);

