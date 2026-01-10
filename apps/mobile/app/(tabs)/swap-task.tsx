import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Task, Project } from '../../types/database';
import { theme } from '../../constants/theme';

interface TaskWithProject extends Task {
  project: Project;
}

export default function SwapTaskScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadEligibleTasks();
  }, []);

  async function loadEligibleTasks() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: assignments } = await supabase
      .from('daily_task_assignments')
      .select('task_id')
      .eq('user_id', user.id);

    const assignedTaskIds = new Set(assignments?.map(a => a.task_id) || []);

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_progress']);

    if (error) {
      Alert.alert('Error', 'Failed to load tasks');
      return;
    }

    const eligible = (data || []).filter(t => !assignedTaskIds.has(t.id)) as TaskWithProject[];
    setTasks(eligible);
  }

  async function handleTaskSelect(task: Task) {
    if (!assignmentId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: assignment } = await supabase
      .from('daily_task_assignments')
      .select('date')
      .eq('id', assignmentId)
      .single();

    if (!assignment) {
      Alert.alert('Error', 'Assignment not found');
      return;
    }

    await supabase
      .from('daily_task_assignments')
      .delete()
      .eq('id', assignmentId);

    const { error } = await supabase
      .from('daily_task_assignments')
      .insert({
        user_id: user.id,
        date: assignment.date,
        task_id: task.id,
      });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Navigate back to home after successful swap
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => handleTaskSelect(item)}
          >
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.projectName}>{item.project?.title || 'Unknown'}</Text>
            <Text style={styles.taskStatus}>
              Status: {item.status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No eligible tasks available. All tasks are already assigned.
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  taskTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  projectName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  taskStatus: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});
