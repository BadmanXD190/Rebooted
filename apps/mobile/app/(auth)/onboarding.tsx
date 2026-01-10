import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { theme } from '../../constants/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKEND = ['Sat', 'Sun'];

export default function OnboardingScreen() {
  const [tasksPerDay, setTasksPerDay] = useState(3);
  const [wakeTime, setWakeTime] = useState(new Date());
  const [sleepTime, setSleepTime] = useState(new Date());
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [typePriorityOrder, setTypePriorityOrder] = useState(['work', 'study', 'life']);
  const [activeDays, setActiveDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const wake = new Date();
    wake.setHours(7, 0, 0, 0);
    setWakeTime(wake);
    
    const sleep = new Date();
    sleep.setHours(23, 0, 0, 0);
    setSleepTime(sleep);
  }, []);

  function toggleDay(day: string) {
    if (activeDays.includes(day)) {
      setActiveDays(activeDays.filter(d => d !== day));
    } else {
      setActiveDays([...activeDays, day]);
    }
  }

  function moveTypeUp(index: number) {
    if (index === 0) return;
    const newOrder = [...typePriorityOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setTypePriorityOrder(newOrder);
  }

  function moveTypeDown(index: number) {
    if (index === typePriorityOrder.length - 1) return;
    const newOrder = [...typePriorityOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setTypePriorityOrder(newOrder);
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  async function handleComplete() {
    if (tasksPerDay < 1 || tasksPerDay > 20) {
      Alert.alert('Error', 'Tasks per day must be between 1 and 20');
      return;
    }

    if (activeDays.length === 0) {
      Alert.alert('Error', 'Please select at least one active day');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      setLoading(false);
      return;
    }

    const wakeTimeStr = formatTime(wakeTime);
    const sleepTimeStr = formatTime(sleepTime);

    const { error: prefError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: user.id,
        tasks_per_day: tasksPerDay,
        wake_time: wakeTimeStr,
        sleep_time: sleepTimeStr,
        type_priority_order: typePriorityOrder,
        active_days: activeDays,
      });

    if (prefError) {
      Alert.alert('Error', prefError.message);
      setLoading(false);
      return;
    }

    const { error: petError } = await supabase
      .from('pet_state')
      .insert({
        user_id: user.id,
        pet_level: 1,
        pet_xp: 0,
      });

    if (petError) {
      console.error('Pet state error:', petError);
    }

    setLoading(false);
    router.replace('/(tabs)/home');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Rebooted!</Text>
        <Text style={styles.subtitle}>Let's set up your preferences</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Tasks per day</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepperButton, tasksPerDay <= 1 && styles.stepperButtonDisabled]}
              onPress={() => setTasksPerDay(Math.max(1, tasksPerDay - 1))}
              disabled={tasksPerDay <= 1}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperValueText}>{tasksPerDay}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperButton, tasksPerDay >= 20 && styles.stepperButtonDisabled]}
              onPress={() => setTasksPerDay(Math.min(20, tasksPerDay + 1))}
              disabled={tasksPerDay >= 20}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wake time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowWakePicker(true)}
          >
            <Text style={styles.timeButtonText}>{formatTime(wakeTime)}</Text>
          </TouchableOpacity>
          {showWakePicker && (
            <DateTimePicker
              value={wakeTime}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowWakePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setWakeTime(selectedTime);
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Sleep time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowSleepPicker(true)}
          >
            <Text style={styles.timeButtonText}>{formatTime(sleepTime)}</Text>
          </TouchableOpacity>
          {showSleepPicker && (
            <DateTimePicker
              value={sleepTime}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowSleepPicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setSleepTime(selectedTime);
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Project type priority</Text>
          <View style={styles.priorityContainer}>
            {typePriorityOrder.map((type, index) => (
              <View key={type} style={styles.priorityRow}>
                <View style={styles.priorityNumber}>
                  <Text style={styles.priorityNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.priorityText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                <View style={styles.priorityButtons}>
                  <TouchableOpacity
                    onPress={() => moveTypeUp(index)}
                    disabled={index === 0}
                    style={[styles.priorityButton, index === 0 && styles.priorityButtonDisabled]}
                  >
                    <Text style={styles.priorityButtonText}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveTypeDown(index)}
                    disabled={index === typePriorityOrder.length - 1}
                    style={[styles.priorityButton, index === typePriorityOrder.length - 1 && styles.priorityButtonDisabled]}
                  >
                    <Text style={styles.priorityButtonText}>↓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Active days</Text>
          <View style={styles.daysContainer}>
            <View style={styles.daysRow}>
              {WEEKDAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    activeDays.includes(day) && styles.dayButtonActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      activeDays.includes(day) && styles.dayButtonTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.daysRow, styles.daysRowCentered]}>
              {WEEKEND.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    activeDays.includes(day) && styles.dayButtonActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      activeDays.includes(day) && styles.dayButtonTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Complete Setup'}</Text>
        </TouchableOpacity>
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
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  timeButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  timeButtonText: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  priorityContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  priorityNumber: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  priorityNumberText: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
  priorityText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  priorityButton: {
    padding: theme.spacing.sm,
  },
  priorityButtonDisabled: {
    opacity: 0.3,
  },
  priorityButtonText: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  daysContainer: {
    gap: theme.spacing.md,
  },
  daysRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  daysRowCentered: {
    justifyContent: 'center',
  },
  dayButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  dayButtonTextActive: {
    color: theme.colors.white,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
});
