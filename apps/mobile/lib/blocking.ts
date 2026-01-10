import { supabase } from './supabase';
import { UserPreferences, Task, DailyTaskAssignment } from '../types/database';
import { format } from 'date-fns';

/**
 * Evaluates if blocking should be active based on:
 * - Current time vs sleep_time
 * - Today's assigned tasks completion status
 * 
 * This is a placeholder for future Android Accessibility Service integration
 */
export async function shouldBlockApps(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('sleep_time')
    .eq('user_id', user.id)
    .single();

  if (!preferences) return false;

  // Check if after sleep time
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  const sleepTime = preferences.sleep_time;

  if (currentTime >= sleepTime) {
    return true; // After sleep time, block apps
  }

  // Check if there are unfinished assigned tasks for today
  const today = format(now, 'yyyy-MM-dd');
  const { data: assignments } = await supabase
    .from('daily_task_assignments')
    .select(`
      *,
      task:tasks(status)
    `)
    .eq('user_id', user.id)
    .eq('date', today);

  if (!assignments || assignments.length === 0) {
    return false; // No assignments, don't block
  }

  // Check if all tasks are completed
  const allCompleted = assignments.every(
    (a: DailyTaskAssignment & { task: Task }) => 
      (a.task as Task)?.status === 'completed'
  );

  return !allCompleted; // Block if not all tasks completed
}

/**
 * Placeholder for Android blocking integration
 * This will be implemented with Accessibility Service and BlockActivity
 */
export async function initializeBlocking() {
  // TODO: Initialize Android Accessibility Service
  // TODO: Set up BlockActivity
  console.log('Blocking feature not yet implemented');
}

