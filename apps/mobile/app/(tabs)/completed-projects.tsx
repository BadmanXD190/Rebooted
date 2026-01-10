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
import { Project, Task } from '../../types/database';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';

interface ProjectWithProgress extends Project {
  completedTasks: number;
  totalTasks: number;
  progress: number;
}

export default function CompletedProjectsScreen() {
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

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
      console.error('Error loading projects:', projectsError);
      setLoading(false);
      return;
    }

    // Load tasks for each project to calculate progress
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
          completedTasks,
          totalTasks,
          progress,
        };
      })
    );

    // Filter only 100% completed projects
    const completedProjects = projectsWithProgress.filter(p => p.progress === 100);
    
    setProjects(completedProjects);
    setLoading(false);
  }

  function handleProjectPress(project: Project) {
    router.push(`/(tabs)/project-detail?id=${project.id}`);
  }

  function handleBack() {
    router.back();
  }

  function getProjectTypeColor(type: string) {
    switch (type) {
      case 'work':
        return theme.colors.primary;
      case 'study':
        return theme.colors.info;
      case 'life':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Completed Projects</Text>
        <Text style={styles.headerSubtitle}>
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} completed
        </Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadProjects} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.projectCard}
            onPress={() => handleProjectPress(item)}
          >
            <View style={styles.projectCardHeader}>
              <View style={styles.projectCardLeft}>
                <View
                  style={[
                    styles.projectTypeBadge,
                    { backgroundColor: getProjectTypeColor(item.project_type) },
                  ]}
                >
                  <Text style={styles.projectTypeText}>
                    {item.project_type.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.projectCardContent}>
                  <Text style={styles.projectTitle}>{item.title}</Text>
                  <View style={styles.projectMeta}>
                    <Text style={styles.projectTypeLabel}>
                      {item.project_type.charAt(0).toUpperCase() + item.project_type.slice(1)}
                    </Text>
                    {item.due_date && (
                      <>
                        <Text style={styles.projectMetaSeparator}>•</Text>
                        <Text style={styles.projectDueDate}>
                          Due {new Date(item.due_date).toLocaleDateString()}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: '100%', backgroundColor: theme.colors.success },
                  ]}
                />
              </View>
              <Text style={styles.progressTextSmall}>
                {item.completedTasks} / {item.totalTasks} tasks completed
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No completed projects yet</Text>
            <Text style={styles.emptySubtext}>Complete all tasks in a project to see it here!</Text>
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
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  projectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  projectCardLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: theme.spacing.md,
  },
  projectTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectTypeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
  projectCardContent: {
    flex: 1,
  },
  projectTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  projectTypeLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  projectMetaSeparator: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
  projectDueDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  progressBarContainer: {
    marginTop: theme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  progressTextSmall: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
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

