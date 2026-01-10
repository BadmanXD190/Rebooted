import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { planFromText, planFromOCR, planFromFile } from '../../lib/api';
import { format } from 'date-fns';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';

type InputType = 'text' | 'image' | 'file';

export default function AddProjectScreen() {
  const [inputType, setInputType] = useState<InputType>('text');
  const [textInput, setTextInput] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState(3);
  const [projectType, setProjectType] = useState<'work' | 'study' | 'life'>('work');
  const [loading, setLoading] = useState(false);
  const [plannerResult, setPlannerResult] = useState<any>(null);
  const router = useRouter();

  // Reset form when screen is focused
  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [])
  );

  function resetForm() {
    setInputType('text');
    setTextInput('');
    setImageUri(null);
    setFileUri(null);
    setFileName(null);
    setDueDate(null);
    setShowDatePicker(false);
    setPriority(3);
    setProjectType('work');
    setPlannerResult(null);
    setLoading(false);
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFileUri(result.assets[0].uri);
        setFileName(result.assets[0].name);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  }

  async function handlePlan() {
    if (inputType === 'text' && !textInput.trim()) {
      Alert.alert('Error', 'Please enter project description');
      return;
    }

    if (inputType === 'image' && !imageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (inputType === 'file' && !fileUri) {
      Alert.alert('Error', 'Please select a PDF or Word file');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (inputType === 'text') {
        result = await planFromText(textInput);
      } else if (inputType === 'image' && imageUri) {
        result = await planFromOCR(imageUri);
      } else if (inputType === 'file' && fileUri && fileName) {
        result = await planFromFile(fileUri, fileName);
      }

      if (result) {
        setPlannerResult(result);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to plan tasks');
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!plannerResult) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setLoading(true);

    // Insert project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: plannerResult.project_title,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        priority: priority,
        project_type: projectType,
      })
      .select()
      .single();

    if (projectError) {
      Alert.alert('Error', projectError.message);
      setLoading(false);
      return;
    }

    // Insert tasks
    const tasks = plannerResult.tasks.map((task: any, index: number) => ({
      user_id: user.id,
      project_id: project.id,
      order_index: index + 1,
      title: task.task_title,
      subtasks_text: task.subtasks_text || '',
      status: 'pending' as const,
    }));

    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks);

    if (tasksError) {
      Alert.alert('Error', tasksError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace('/(tabs)/projects');
  }

  if (plannerResult) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity onPress={() => setPlannerResult(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.section}>
            <Input
              label="Project Title"
              value={plannerResult.project_title}
              onChangeText={(text) =>
                setPlannerResult({ ...plannerResult, project_title: text })
              }
              placeholder="Enter project title"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Tasks</Text>
            {plannerResult.tasks.map((task: any, index: number) => (
              <View key={index} style={styles.taskItem}>
                <Text style={styles.taskLabel}>Task {index + 1}</Text>
                <Input
                  value={task.task_title}
                  onChangeText={(text) => {
                    const newTasks = [...plannerResult.tasks];
                    newTasks[index].task_title = text;
                    setPlannerResult({ ...plannerResult, tasks: newTasks });
                  }}
                  placeholder="Task title"
                />
                <Input
                  value={task.subtasks_text}
                  onChangeText={(text) => {
                    const newTasks = [...plannerResult.tasks];
                    newTasks[index].subtasks_text = text;
                    setPlannerResult({ ...plannerResult, tasks: newTasks });
                  }}
                  placeholder="Subtasks (one per line)"
                  multiline
                  numberOfLines={4}
                />
              </View>
            ))}
          </View>

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
            title={loading ? 'Saving...' : 'Save Project'}
            onPress={handleSave}
            loading={loading}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.topPadding}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/projects')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Input Type</Text>
          <View style={styles.inputTypeButtons}>
            {(['text', 'image', 'file'] as InputType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.inputTypeButton,
                  inputType === type && styles.inputTypeButtonActive,
                ]}
                onPress={() => setInputType(type)}
              >
                <Text
                  style={[
                    styles.inputTypeButtonText,
                    inputType === type && styles.inputTypeButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {inputType === 'text' && (
          <View style={styles.section}>
            <Input
              label="Project Description"
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Enter project description or task list..."
              multiline
              numberOfLines={8}
            />
          </View>
        )}

        {inputType === 'image' && (
          <View style={styles.section}>
            <Text style={styles.label}>Image</Text>
            {imageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <Button
                  title="Change Image"
                  onPress={handlePickImage}
                  variant="secondary"
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickImage}
              >
                <Text style={styles.uploadButtonText}>Upload Image</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {inputType === 'file' && (
          <View style={styles.section}>
            <Text style={styles.label}>PDF/Word File</Text>
            {fileUri ? (
              <View style={styles.fileContainer}>
                <View style={styles.fileInfo}>
                  <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                  <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
                </View>
                <Button
                  title="Change File"
                  onPress={handlePickFile}
                  variant="secondary"
                  fullWidth={false}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickFile}
              >
                <Text style={styles.uploadButtonText}>Upload PDF/Word File</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Button
          title={loading ? 'Planning...' : 'Plan Tasks'}
          onPress={handlePlan}
          loading={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xxl,
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
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputTypeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inputTypeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  inputTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  inputTypeButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  inputTypeButtonTextActive: {
    color: theme.colors.white,
  },
  imageContainer: {
    gap: theme.spacing.md,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    resizeMode: 'contain',
    backgroundColor: theme.colors.borderLight,
  },
  fileContainer: {
    gap: theme.spacing.md,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  fileName: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  taskItem: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  taskLabel: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
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
  uploadButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  uploadButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
});
