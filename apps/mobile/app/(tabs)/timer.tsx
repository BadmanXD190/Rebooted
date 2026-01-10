import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Task } from '../../types/database';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';

export default function TimerScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Reset timer state when taskId changes (but keep seconds until task loads)
    setIsRunning(false);
    setIsPaused(false);
    setSessionId(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    
    loadTask();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskId]);

  async function loadTask() {
    if (!taskId) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to load task');
      router.back();
    } else {
      setTask(data);
      // Initialize timer with existing total_minutes (convert to seconds)
      const existingMinutes = data.total_minutes || 0;
      setSeconds(existingMinutes * 60);
      
      // Set status to in_progress if pending
      if (data.status === 'pending') {
        await supabase
          .from('tasks')
          .update({ status: 'in_progress' })
          .eq('id', taskId);
      }
    }
  }

  function startTimer() {
    if (isRunning) return;

    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now() - seconds * 1000;

    // Create session
    createSession();

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSeconds(elapsed);
      }
    }, 1000);
  }

  async function createSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !taskId) return;

    const { data, error } = await supabase
      .from('task_sessions')
      .insert({
        user_id: user.id,
        task_id: taskId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create session:', error);
    } else {
      setSessionId(data.id);
    }
  }

  function pauseTimer() {
    if (!isRunning) return;
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function resumeTimer() {
    if (!isPaused || !isRunning) return;
    setIsPaused(false);
    startTimeRef.current = Date.now() - seconds * 1000;
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSeconds(elapsed);
      }
    }, 1000);
  }

  async function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const durationMinutes = Math.floor(seconds / 60);
    
    if (sessionId) {
      await supabase
        .from('task_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId);
    }

    // Update task total_minutes
    if (task) {
      await supabase
        .from('tasks')
        .update({ total_minutes: (task.total_minutes || 0) + durationMinutes })
        .eq('id', task.id);
    }

    setIsRunning(false);
    setIsPaused(false);
    router.back();
  }

  async function handleBack() {
    // If timer is running, stop it first
    if (isRunning && !isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const durationMinutes = Math.floor(seconds / 60);
      
      if (sessionId) {
        await supabase
          .from('task_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_minutes: durationMinutes,
          })
          .eq('id', sessionId);
      }

      // Update task total_minutes
      if (task) {
        await supabase
          .from('tasks')
          .update({ total_minutes: (task.total_minutes || 0) + durationMinutes })
          .eq('id', task.id);
      }

      setIsRunning(false);
      setIsPaused(false);
    }
    
    router.back();
  }

  async function completeTask() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const durationMinutes = Math.floor(seconds / 60);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !task) return;

    // End session
    if (sessionId) {
      await supabase
        .from('task_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId);
    }

    const newTotalMinutes = (task.total_minutes || 0) + durationMinutes;

    // Update task
    await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_minutes: newTotalMinutes,
      })
      .eq('id', task.id);

    // Add points
    await supabase
      .from('points_ledger')
      .insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        delta_points: newTotalMinutes,
        reason: 'task_time',
        ref_task_id: task.id,
      });

    router.back();
  }

  function formatTime(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function renderSubtasks() {
    if (!task || !task.subtasks_text) return null;

    const lines = task.subtasks_text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

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

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topPadding}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          
          <Text style={styles.taskTitle}>{task.title}</Text>
          
          {renderSubtasks()}

          <View style={styles.timerContainer}>
            <Text style={styles.timer} numberOfLines={1} adjustsFontSizeToFit>
              {formatTime(seconds)}
            </Text>
          </View>
          <Text style={styles.minutes}>{Math.floor(seconds / 60)} minutes</Text>

          <View style={styles.buttonContainer}>
            {!isRunning ? (
              <Button title="Start" onPress={startTimer} />
            ) : (
              <>
                {isPaused ? (
                  <Button title="Resume" onPress={resumeTimer} />
                ) : (
                  <Button title="Pause" onPress={pauseTimer} variant="secondary" />
                )}
                <Button title="Stop" onPress={stopTimer} variant="secondary" />
              </>
            )}
            <Button title="Mark Complete" onPress={completeTask} />
          </View>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  taskTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  subtasksContainer: {
    width: '100%',
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  subtasksTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  subtaskBullet: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  subtaskText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  minutes: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xxl,
  },
  buttonContainer: {
    width: '100%',
    gap: theme.spacing.md,
  },
});

