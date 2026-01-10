import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Project, Task } from '../../types/database';
import { format } from 'date-fns';
import { theme } from '../../constants/theme';

export default function AddTaskToTodayScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectsError) {
      Alert.alert('Error', 'Failed to load projects');
      return;
    }

    // Calculate progress for each project and filter out completed ones
    const projectsWithProgress = await Promise.all(
      (projectsData || []).map(async (project) => {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', project.id);

        const totalTasks = tasksData?.length || 0;
        const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
          ...project,
          progress,
        };
      })
    );

    // Filter out 100% completed projects
    const activeProjects = projectsWithProgress.filter(p => p.progress < 100);
    setProjects(activeProjects);
  }

  async function loadTasks(projectId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all tasks that are already assigned to daily_task_assignments
    const { data: assignmentsData } = await supabase
      .from('daily_task_assignments')
      .select('task_id')
      .eq('user_id', user.id);

    const assignedTaskIds = new Set(assignmentsData?.map(a => a.task_id) || []);

    // Load tasks for the project
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['pending', 'in_progress'])
      .order('order_index', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Failed to load tasks');
    } else {
      // Filter out tasks that are already assigned to daily tasks
      const availableTasks = (data || []).filter(task => !assignedTaskIds.has(task.id));
      setTasks(availableTasks);
    }
  }

  function handleProjectSelect(project: Project) {
    setSelectedProject(project);
    loadTasks(project.id);
  }

  async function handleTaskSelect(task: Task) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('daily_task_assignments')
      .select('id')
      .eq('task_id', task.id)
      .single();

    if (existing) {
      Alert.alert('Error', 'This task is already assigned to a day');
      return;
    }

    const { error } = await supabase
      .from('daily_task_assignments')
      .insert({
        user_id: user.id,
        date: today,
        task_id: task.id,
      });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Navigate back to home after successful assignment
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }

  if (selectedProject) {
    return (
      <View style={styles.container}>
        <View style={styles.topPadding}>
          <TouchableOpacity
            onPress={() => {
              setSelectedProject(null);
              setTasks([]);
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>From {selectedProject.title}</Text>
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
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No pending tasks in this project</Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.projectCard}
            onPress={() => handleProjectSelect(item)}
          >
            <Text style={styles.projectTitle}>{item.title}</Text>
            <Text style={styles.projectType}>{item.project_type}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No projects available</Text>
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
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  projectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  projectTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  projectType: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  taskTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});
