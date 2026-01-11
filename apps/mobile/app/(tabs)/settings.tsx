import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { UserPreferences } from '../../types/database';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { updateBlockingStatus } from '../../lib/blocking';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function formatTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export default function SettingsScreen() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to load preferences');
    } else {
      setPreferences(data);
    }
    setLoading(false);
  }

  async function savePreferences() {
    if (!preferences) return;

    const tasksPerDayNum = parseInt(preferences.tasks_per_day.toString());
    if (isNaN(tasksPerDayNum) || tasksPerDayNum < 1 || tasksPerDayNum > 20) {
      Alert.alert('Error', 'Tasks per day must be between 1 and 20');
      return;
    }

    if (preferences.active_days.length === 0) {
      Alert.alert('Error', 'Please select at least one active day');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('user_preferences')
      .update({
        tasks_per_day: tasksPerDayNum,
        wake_time: preferences.wake_time,
        sleep_time: preferences.sleep_time,
        type_priority_order: preferences.type_priority_order,
        active_days: preferences.active_days,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', preferences.user_id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Preferences saved!');
      // Update blocking status when preferences change
      await updateBlockingStatus();
    }
  }

  async function handleBlockingToggle(value: boolean) {
    if (!preferences) return;
    
    const updated = { ...preferences, android_blocking_enabled: value };
    setPreferences(updated);
    
    // Save immediately
    const { error } = await supabase
      .from('user_preferences')
      .update({
        android_blocking_enabled: value,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', preferences.user_id);

    if (error) {
      Alert.alert('Error', 'Failed to update blocking setting');
      // Revert on error
      setPreferences(preferences);
    } else {
      // Update blocking status
      await updateBlockingStatus();
    }
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function toggleDay(day: string) {
    if (!preferences) return;
    const currentDays = preferences.active_days;
    if (currentDays.includes(day)) {
      setPreferences({
        ...preferences,
        active_days: currentDays.filter(d => d !== day),
      });
    } else {
      setPreferences({
        ...preferences,
        active_days: [...currentDays, day],
      });
    }
  }

  function moveTypeUp(index: number) {
    if (!preferences || index === 0) return;
    const newOrder = [...preferences.type_priority_order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setPreferences({ ...preferences, type_priority_order: newOrder });
  }

  function moveTypeDown(index: number) {
    if (!preferences || index === preferences.type_priority_order.length - 1) return;
    const newOrder = [...preferences.type_priority_order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setPreferences({ ...preferences, type_priority_order: newOrder });
  }

  if (loading || !preferences) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPadding}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tasks per day</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepperButton, preferences.tasks_per_day <= 1 && styles.stepperButtonDisabled]}
              onPress={() => setPreferences({ ...preferences, tasks_per_day: Math.max(1, preferences.tasks_per_day - 1) })}
              disabled={preferences.tasks_per_day <= 1}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperValueText}>{preferences.tasks_per_day}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperButton, preferences.tasks_per_day >= 20 && styles.stepperButtonDisabled]}
              onPress={() => setPreferences({ ...preferences, tasks_per_day: Math.min(20, preferences.tasks_per_day + 1) })}
              disabled={preferences.tasks_per_day >= 20}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wake time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowWakeTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.timeButtonText}>
              {preferences.wake_time || '07:00'}
            </Text>
          </TouchableOpacity>
          {showWakeTimePicker && (
            <DateTimePicker
              value={formatTime(preferences.wake_time)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowWakeTimePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setPreferences({ ...preferences, wake_time: formatTimeString(selectedTime) });
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sleep time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowSleepTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.timeButtonText}>
              {preferences.sleep_time || '23:00'}
            </Text>
          </TouchableOpacity>
          {showSleepTimePicker && (
            <DateTimePicker
              value={formatTime(preferences.sleep_time)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowSleepTimePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setPreferences({ ...preferences, sleep_time: formatTimeString(selectedTime) });
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Project type priority</Text>
          <View style={styles.typePriorityContainer}>
            {preferences.type_priority_order.map((type, index) => (
              <View key={type} style={styles.typePriorityRow}>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(type) }]}>
                  <Text style={styles.typeBadgeText}>
                    {type.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.typePriorityText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
                <View style={styles.typePriorityButtons}>
                  <TouchableOpacity
                    onPress={() => moveTypeUp(index)}
                    disabled={index === 0}
                    style={[styles.typePriorityButton, index === 0 && styles.typePriorityButtonDisabled]}
                  >
                    <Ionicons 
                      name="chevron-up" 
                      size={20} 
                      color={index === 0 ? theme.colors.textLight : theme.colors.primary} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveTypeDown(index)}
                    disabled={index === preferences.type_priority_order.length - 1}
                    style={[
                      styles.typePriorityButton,
                      index === preferences.type_priority_order.length - 1 && styles.typePriorityButtonDisabled,
                    ]}
                  >
                    <Ionicons 
                      name="chevron-down" 
                      size={20} 
                      color={index === preferences.type_priority_order.length - 1 ? theme.colors.textLight : theme.colors.primary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Active days</Text>
          <View style={styles.daysContainer}>
            {DAYS.map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  preferences.active_days.includes(day) && styles.dayButtonActive,
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    preferences.active_days.includes(day) && styles.dayButtonTextActive,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Android Blocking</Text>
          <Text style={styles.hint}>
            Block entertainment apps when tasks are incomplete or after sleep time
          </Text>
          <View style={styles.switchContainer}>
            <Switch
              value={preferences?.android_blocking_enabled || false}
              onValueChange={handleBlockingToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>
        </View>

        <Button
          title={saving ? 'Saving...' : 'Save Preferences'}
          onPress={savePreferences}
          loading={saving}
        />

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="secondary"
        />
      </ScrollView>
    </View>
  );

  function getTypeColor(type: string) {
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  sectionLabel: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  stepperButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.white,
  },
  stepperValue: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  stepperValueText: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  timeButton: {
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
  timeButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  typePriorityContainer: {
    gap: theme.spacing.sm,
  },
  typePriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
    fontSize: 14,
  },
  typePriorityText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  typePriorityButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  typePriorityButton: {
    padding: theme.spacing.xs,
  },
  typePriorityButtonDisabled: {
    opacity: 0.3,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  dayButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  dayButtonTextActive: {
    color: theme.colors.white,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
});

