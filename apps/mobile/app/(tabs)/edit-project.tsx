import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { Project } from '../../types/database';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { format } from 'date-fns';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState(3);
  const [projectType, setProjectType] = useState<'work' | 'study' | 'life'>('work');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  function handleBack() {
    // Navigate back to project detail page
    if (id) {
      router.replace(`/(tabs)/project-detail?id=${id}`);
    } else {
      router.back();
    }
  }

  useEffect(() => {
    loadProject();
  }, [id]);

  async function loadProject() {
    if (!id) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to load project');
      router.back();
    } else {
      setProject(data);
      setTitle(data.title);
      setDueDate(data.due_date ? new Date(data.due_date) : null);
      setPriority(data.priority);
      setProjectType(data.project_type);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a project title');
      return;
    }

    if (!id) return;

    setLoading(true);

    const { error } = await supabase
      .from('projects')
      .update({
        title: title.trim(),
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        priority: priority,
        project_type: projectType,
      })
      .eq('id', id);

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Navigate back to project detail page
      if (id) {
        router.replace(`/(tabs)/project-detail?id=${id}`);
      } else {
        router.back();
      }
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Project', 'Are you sure? This will delete all tasks in this project.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

          if (error) {
            Alert.alert('Error', error.message);
          } else {
            router.replace('/(tabs)/projects');
          }
        },
      },
    ]);
  }

  if (loading || !project) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Input
          label="Project Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter project title"
        />

        <View style={styles.section}>
          <Text style={styles.label}>Due Date (optional)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.dateButtonText}>
              {dueDate ? format(dueDate, 'MMM dd, yyyy') : 'Select date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDueDate(selectedDate);
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.priorityLabelContainer}>
            <Text style={styles.label}>Priority</Text>
            <Text style={styles.priorityLabel}>
              {priority === 5 ? 'Most prioritize' : priority === 1 ? 'Less prioritize' : `Priority ${priority}`}
            </Text>
          </View>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepperButton, priority <= 1 && styles.stepperButtonDisabled]}
              onPress={() => setPriority(Math.max(1, priority - 1))}
              disabled={priority <= 1}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperValueText}>{priority}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperButton, priority >= 5 && styles.stepperButtonDisabled]}
              onPress={() => setPriority(Math.min(5, priority + 1))}
              disabled={priority >= 5}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Project Type</Text>
          <View style={styles.typeButtons}>
            {(['work', 'study', 'life'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  projectType === type && styles.typeButtonActive,
                ]}
                onPress={() => setProjectType(type)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    projectType === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title={loading ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          loading={loading}
        />

        <Button
          title="Delete Project"
          onPress={handleDelete}
          variant="secondary"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  topPadding: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  dateButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  stepperButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  stepperButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.white,
  },
  stepperValue: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  stepperValueText: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  priorityLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  priorityLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  typeButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  typeButtonTextActive: {
    color: theme.colors.white,
  },
});
