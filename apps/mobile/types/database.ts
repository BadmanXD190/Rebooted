export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type PointsReason = 'task_time' | 'petting' | 'feeding';
export type ProjectType = 'work' | 'study' | 'life';

export interface UserPreferences {
  user_id: string;
  tasks_per_day: number;
  wake_time: string;
  sleep_time: string;
  type_priority_order: string[];
  active_days: string[];
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  priority: number;
  project_type: ProjectType;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string;
  order_index: number;
  title: string;
  subtasks_text: string;
  status: TaskStatus;
  total_minutes: number;
  completed_at: string | null;
  created_at: string;
}

export interface DailyTaskAssignment {
  id: string;
  user_id: string;
  date: string;
  task_id: string;
  created_at: string;
}

export interface TaskSession {
  id: string;
  user_id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  created_at: string;
}

export interface PointsLedgerEntry {
  id: string;
  user_id: string;
  date: string;
  delta_points: number;
  reason: PointsReason;
  ref_task_id: string | null;
  created_at: string;
}

export interface PetState {
  user_id: string;
  pet_level: number;
  pet_xp: number;
  updated_at: string;
}

export interface TaskWithProject extends Task {
  project: Project;
}

export interface DailyTaskAssignmentWithTask extends DailyTaskAssignment {
  task: TaskWithProject;
}

