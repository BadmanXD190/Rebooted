import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Task } from '../../types/database';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [subtasks, setSubtasks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadTask();
  }, [id]);

  async function loadTask() {
    if (!id) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to load task');
      router.back();
    } else {
      setTask(data);
      setTitle(data.title);
      // Remove bullet points from subtasks for editing
      const subtasksText = data.subtasks_text
        ? data.subtasks_text.split('\n')
            .map(line => line.trim().replace(/^[-•]\s*/, ''))
            .filter(line => line.trim())
            .join('\n')
        : '';
      setSubtasks(subtasksText);
    }
    setLoading(false);
  }

  function handleBack() {
    // Navigate back to task detail page
    if (id) {
      router.replace(`/(tabs)/task-detail?id=${id}`);
    } else {
      router.back();
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!id) return;

    setSaving(true);

    // Format subtasks with bullet points
    const subtasksText = subtasks
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim().startsWith('-') ? line.trim() : `- ${line.trim()}`)
      .join('\n');

    const { error } = await supabase
      .from('tasks')
      .update({
        title: title.trim(),
        subtasks_text: subtasksText,
      })
      .eq('id', id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Navigate back to task detail page
      if (id) {
        router.replace(`/(tabs)/task-detail?id=${id}`);
      } else {
        router.back();
      }
    }
  }

  if (loading || !task) {
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
          label="Task Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter task title"
        />

        <Input
          label="Subtasks (one per line, optional)"
          value={subtasks}
          onChangeText={setSubtasks}
          placeholder="Enter subtasks, one per line..."
          multiline
          numberOfLines={8}
        />

        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          loading={saving}
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
  },
});

