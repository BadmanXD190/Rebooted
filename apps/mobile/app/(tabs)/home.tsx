import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ensureTodayAssignments } from '../../lib/dailyAssignments';
import { DailyTaskAssignmentWithTask, Task } from '../../types/database';
import { format } from 'date-fns';
import { theme } from '../../constants/theme';

export default function HomeScreen() {
  const [assignments, setAssignments] = useState<DailyTaskAssignmentWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadData();
      ensureTodayAssignments();
    }, [])
  );

  useEffect(() => {
    loadData();
    ensureTodayAssignments();
  }, []);

  async function loadData() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_task_assignments')
      .select(`
        *,
        task:tasks(
          *,
          project:projects(*)
        )
      `)
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading assignments:', error);
    } else {
      // Sort assignments: incomplete tasks first, then completed tasks
      const sorted = (data || []).sort((a, b) => {
        const taskA = a.task as Task;
        const taskB = b.task as Task;
        const aCompleted = taskA.status === 'completed';
        const bCompleted = taskB.status === 'completed';
        
        // If one is completed and the other isn't, incomplete comes first
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        
        // If both have same completion status, maintain original order
        return 0;
      });
      
      setAssignments(sorted as DailyTaskAssignmentWithTask[]);
    }
    setLoading(false);
  }

  function handleTaskPress(task: Task) {
    router.push(`/(tabs)/task-detail?id=${task.id}`);
  }

  function handleAddTask() {
    router.push('/(tabs)/add-task-to-today');
  }

  function handleSwapTask(assignmentId: string) {
    router.push(`/(tabs)/swap-task?assignmentId=${assignmentId}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <Text style={styles.title}>Rebooted</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Ionicons name="add-circle" size={20} color={theme.colors.white} />
        <Text style={styles.addButtonText}>Add Task to Today</Text>
      </TouchableOpacity>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const task = item.task as Task & { project: any };
          const isCompleted = task.status === 'completed';
          const isInProgress = task.status === 'in_progress';
          
          return (
            <TouchableOpacity
              style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
              onPress={() => handleTaskPress(task)}
            >
              <View style={styles.taskCardHeader}>
                <View style={styles.taskCardLeft}>
                  <View style={[styles.statusIndicator, isCompleted && styles.statusIndicatorCompleted]} />
                  <View style={styles.taskCardContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.projectName}>{task.project?.title || 'Unknown'}</Text>
                  </View>
                </View>
                {isCompleted ? (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                ) : isInProgress ? (
                  <View style={styles.inProgressDot} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color={theme.colors.textLight} />
                )}
              </View>
              {task.total_minutes > 0 && (
                <View style={styles.taskMeta}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.taskTime}>{task.total_minutes} min</Text>
                </View>
              )}
              {!isCompleted && (
                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={() => handleSwapTask(item.id)}
                >
                  <Ionicons name="swap-horizontal" size={16} color={theme.colors.primary} />
                  <Text style={styles.swapButtonText}>Swap</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No tasks assigned for today</Text>
            <Text style={styles.emptySubtext}>Tasks will be automatically assigned based on your preferences</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topPadding: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    margin: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  addButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  taskCardCompleted: {
    opacity: 0.7,
    backgroundColor: theme.colors.borderLight,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  taskCardLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: theme.spacing.sm,
  },
  statusIndicator: {
    width: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
  statusIndicatorCompleted: {
    backgroundColor: theme.colors.success,
  },
  taskCardContent: {
    flex: 1,
  },
  taskTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  projectName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  taskTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  swapButtonText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  inProgressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
});

