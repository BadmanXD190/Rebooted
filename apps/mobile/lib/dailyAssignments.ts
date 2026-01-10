import { supabase } from './supabase';
import { UserPreferences, Task, DailyTaskAssignment, Project } from '../types/database';
import { format } from 'date-fns';

/**
 * Ensures today's task assignments based on user preferences
 */
export async function ensureTodayAssignments(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get user preferences
  const { data: preferences, error: prefError } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (prefError || !preferences) {
    console.error('Failed to load user preferences:', prefError);
    return;
  }

  // Check if today is an active day
  const today = new Date();
  const dayName = format(today, 'EEE');
  if (!preferences.active_days.includes(dayName)) {
    return; // Not an active day
  }

  const todayStr = format(today, 'yyyy-MM-dd');
  const tasksNeeded = preferences.tasks_per_day;

  // Check existing assignments for today
  const { data: existingAssignments } = await supabase
    .from('daily_task_assignments')
    .select('task_id')
    .eq('user_id', user.id)
    .eq('date', todayStr);

  const existingTaskIds = new Set(existingAssignments?.map(a => a.task_id) || []);

  if (existingTaskIds.size >= tasksNeeded) {
    return; // Already have enough assignments
  }

  const needed = tasksNeeded - existingTaskIds.size;

  // Get candidate tasks (pending or in_progress)
  const { data: allCandidateTasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(*)
    `)
    .eq('user_id', user.id)
    .in('status', ['pending', 'in_progress']);

  if (tasksError || !allCandidateTasks) {
    console.error('Failed to load candidate tasks:', tasksError);
    return;
  }

  // Filter out tasks that are already assigned
  const candidateTasks = allCandidateTasks.filter(
    task => !existingTaskIds.has(task.id)
  );

  // Sort candidates by:
  // 1. due_date asc (null last)
  // 2. priority desc (higher priority = 5 comes first, lower priority = 1 comes last)
  // 3. project_type by type_priority_order
  // 4. order_index asc
  const typeOrder = preferences.type_priority_order;
  const sorted = candidateTasks
    .map(t => ({
      ...t,
      project: t.project as Project,
    }))
    .sort((a, b) => {
      // Due date (null last)
      if (a.project.due_date && !b.project.due_date) return -1;
      if (!a.project.due_date && b.project.due_date) return 1;
      if (a.project.due_date && b.project.due_date) {
        const dateDiff = new Date(a.project.due_date).getTime() - new Date(b.project.due_date).getTime();
        if (dateDiff !== 0) return dateDiff;
      }

      // Priority (descending: 5 = most prioritize comes first, 1 = less prioritize comes last)
      if (a.project.priority !== b.project.priority) {
        return b.project.priority - a.project.priority;
      }

      // Project type order
      const aTypeIndex = typeOrder.indexOf(a.project.project_type);
      const bTypeIndex = typeOrder.indexOf(b.project.project_type);
      if (aTypeIndex !== bTypeIndex) {
        return aTypeIndex - bTypeIndex;
      }

      // Order index
      return a.order_index - b.order_index;
    })
    .slice(0, needed);

  // Insert assignments (only those that don't already exist)
  if (sorted.length > 0) {
    // Double-check for any assignments that might have been created between our check and now
    const { data: finalCheck } = await supabase
      .from('daily_task_assignments')
      .select('task_id')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .in('task_id', sorted.map(t => t.id));

    const finalExistingTaskIds = new Set(finalCheck?.map(a => a.task_id) || []);
    
    // Filter out any tasks that are now assigned
    const tasksToInsert = sorted.filter(
      task => !finalExistingTaskIds.has(task.id)
    );

    if (tasksToInsert.length > 0) {
      const assignments = tasksToInsert.map(task => ({
        user_id: user.id,
        date: todayStr,
        task_id: task.id,
      }));

      const { error: insertError } = await supabase
        .from('daily_task_assignments')
        .insert(assignments);

      if (insertError) {
        // If it's a duplicate key error, it's okay - just log it
        if (insertError.code === '23505') {
          console.log('Some assignments already exist, skipping duplicates');
        } else {
          console.error('Failed to insert assignments:', insertError);
        }
      }
    }
  }
}

