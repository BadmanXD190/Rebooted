import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Task, Project } from '../../types/database';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task & { project: Project } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadTask();
    }, [id])
  );

  useEffect(() => {
    loadTask();
  }, [id]);

  async function loadTask() {
    if (!id) return;

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to load task');
      router.back();
    } else {
      setTask(data as Task & { project: Project });
    }
    setLoading(false);
  }

  function handleStart() {
    router.push(`/(tabs)/timer?taskId=${id}`);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'in_progress':
        return theme.colors.info;
      default:
        return theme.colors.textSecondary;
    }
  }

  function renderSubtasks() {
    if (!task || !task.subtasks_text) return null;

    const lines = task.subtasks_text.split('\n').filter(line => line.trim());
    return (
      <View style={styles.subtasksContainer}>
        <Text style={styles.subtasksTitle}>Subtasks:</Text>
        {lines.map((line, index) => (
          <View key={index} style={styles.subtaskItem}>
            <Text style={styles.subtaskBullet}>•</Text>
            <Text style={styles.subtaskText}>{line.trim().replace(/^[-•]\s*/, '')}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Task not found</Text>
      </View>
    );
  }

  function handleBack() {
    // Try to go back first - this will work if there's navigation history
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no history, navigate to project detail if available, otherwise home
      if (task?.project?.id) {
        router.replace(`/(tabs)/project-detail?id=${task.project.id}`);
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.taskCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{task.title}</Text>
            <TouchableOpacity 
              onPress={() => {
                if (id) {
                  router.push(`/(tabs)/edit-task?id=${id}`);
                }
              }}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="folder-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.projectName} numberOfLines={1} ellipsizeMode="tail">
                {task.project?.title || 'Unknown'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                {task.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          {task.total_minutes > 0 && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.timeText}>Total time: {task.total_minutes} minutes</Text>
            </View>
          )}
        </View>

        {renderSubtasks()}

        <View style={styles.buttonContainer}>
          {task.status !== 'completed' && (
            <Button
              title="Start Timer"
              onPress={handleStart}
            />
          )}
        </View>
      </ScrollView>
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
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    flex: 1,
  },
  editButton: {
    padding: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  projectName: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  timeText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  subtasksContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  subtasksTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subtaskItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  subtaskBullet: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  subtaskText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  buttonContainer: {
    marginTop: theme.spacing.md,
  },
});
