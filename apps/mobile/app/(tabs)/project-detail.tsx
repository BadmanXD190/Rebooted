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
import { Project, Task } from '../../types/database';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError) {
      Alert.alert('Error', 'Failed to load project');
      router.back();
      return;
    }

    setProject(projectData);

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', id)
      .order('order_index', { ascending: true });

    if (tasksError) {
      console.error('Error loading tasks:', tasksError);
    } else {
      const tasksList = tasksData || [];
      setTasks(tasksList);
      
      // Calculate progress
      const totalTasks = tasksList.length;
      const completedTasks = tasksList.filter(t => t.status === 'completed').length;
      const progressValue = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      setProgress(progressValue);
    }

    setLoading(false);
  }

  function handleTaskPress(task: Task) {
    router.push(`/(tabs)/task-detail?id=${task.id}`);
  }

  function handleAddTask() {
    router.push(`/(tabs)/add-task?projectId=${id}`);
  }

  function handleEditProject() {
    router.push(`/(tabs)/edit-project?id=${id}`);
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

  function renderSubtasks(subtasksText: string) {
    if (!subtasksText) return null;
    const lines = subtasksText.split('\n').filter(line => line.trim());
    return (
      <View style={styles.subtasksContainer}>
        {lines.map((line, index) => (
          <View key={index} style={styles.subtaskItem}>
            <Text style={styles.subtaskBullet}>•</Text>
            <Text style={styles.subtaskText}>{line.trim().replace(/^[-•]\s*/, '')}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (loading || !project) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  function handleBack() {
    router.replace('/(tabs)/projects');
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{project.title}</Text>
          
          {project.due_date && (
            <View style={styles.dueDateRow}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.dueDate}>
                {new Date(project.due_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <View style={styles.progressHeaderLeft}>
                <View
                  style={[
                    styles.projectTypeBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.projectTypeText}>
                    {project.project_type.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.progressLabel}>Progress</Text>
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress}%`, backgroundColor: theme.colors.primary },
                ]}
              />
            </View>
            <Text style={styles.progressSubtext}>
              {tasks.filter(t => t.status === 'completed').length} / {tasks.length} tasks completed
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProject}>
          <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.addButtonContainer}>
        <Button
          title="Add Task"
          onPress={handleAddTask}
          fullWidth={true}
        />
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => handleTaskPress(item)}
          >
            <View style={styles.taskCardHeader}>
              <View style={styles.taskCardLeft}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                />
                <View style={styles.taskCardContent}>
                  <Text style={styles.taskTitle}>{item.title}</Text>
                  <View style={styles.taskMeta}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(item.status) },
                        ]}
                      >
                        {item.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    {item.total_minutes > 0 && (
                      <>
                        <Text style={styles.metaSeparator}>•</Text>
                        <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.taskTime}>{item.total_minutes} min</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              {item.status === 'completed' && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              )}
            </View>
            {renderSubtasks(item.subtasks_text)}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Add one to get started!</Text>
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
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  dueDate: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    marginBottom: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  projectTypeBadge: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectTypeText: {
    ...theme.typography.captionBold,
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  progressLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  progressText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  progressSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  editButton: {
    padding: theme.spacing.sm,
  },
  addButtonContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
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
    marginTop: 4,
  },
  taskCardContent: {
    flex: 1,
  },
  taskTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '600',
  },
  taskTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  subtasksContainer: {
    marginTop: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  subtaskItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  subtaskBullet: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  subtaskText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
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
});
