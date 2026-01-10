import React, { useState } from 'react';
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
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function AddTaskScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [title, setTitle] = useState('');
  const [subtasks, setSubtasks] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleBack() {
    if (projectId) {
      router.replace(`/(tabs)/project-detail?id=${projectId}`);
    } else {
      router.back();
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!projectId) {
      Alert.alert('Error', 'Project ID missing');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = tasks && tasks.length > 0 ? tasks[0].order_index + 1 : 1;

    setLoading(true);

    const subtasksText = subtasks
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim().startsWith('-') ? line.trim() : `- ${line.trim()}`)
      .join('\n');

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        project_id: projectId,
        order_index: nextOrderIndex,
        title: title.trim(),
        subtasks_text: subtasksText,
        status: 'pending',
      });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Navigate back to project detail page
      if (projectId) {
        router.replace(`/(tabs)/project-detail?id=${projectId}`);
      } else {
        router.back();
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
          numberOfLines={6}
        />

        <Button
          title={loading ? 'Saving...' : 'Save Task'}
          onPress={handleSave}
          loading={loading}
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
