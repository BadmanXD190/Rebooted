import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import LottieView, { LottieViewProps } from 'lottie-react-native';
import { supabase } from '../../lib/supabase';
import { PointsLedgerEntry, Task, PetState } from '../../types/database';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { theme } from '../../constants/theme';

export default function InsightsScreen() {
  const [totalPoints, setTotalPoints] = useState(0);
  const [petState, setPetState] = useState<PetState | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);
  const [showLoveAnimations, setShowLoveAnimations] = useState(false);
  const [showCarrotAnimations, setShowCarrotAnimations] = useState(false);
  const [loveLayer, setLoveLayer] = useState<1 | 2 | 3 | null>(null);
  const carrotAnimationRefsInner = useRef<LottieView[]>([]);
  const carrotAnimationRefsOuter = useRef<LottieView[]>([]);
  
  const petAnimationRef = useRef<LottieView>(null);
  const loveAnimationRefsLayer1 = useRef<LottieView[]>([]);
  const loveAnimationRefsLayer2 = useRef<LottieView[]>([]);
  const loveAnimationRefsLayer3 = useRef<LottieView[]>([]);
  const rotationAnim = useRef(new Animated.Value(0)).current;
  
  // Number of surrounding animations per layer
  const NUM_LOVE_ANIMATIONS_PER_LAYER = 10;
  const NUM_CARROT_ANIMATIONS_INNER = 15; // Reduced from 30 to 15 (half)
  const NUM_CARROT_ANIMATIONS_OUTER = 15; // Outer layer

  useEffect(() => {
    loadData();
  }, []);

  // Initialize animation refs arrays
  useEffect(() => {
    loveAnimationRefsLayer1.current = Array(NUM_LOVE_ANIMATIONS_PER_LAYER).fill(null).map(() => null);
    loveAnimationRefsLayer2.current = Array(NUM_LOVE_ANIMATIONS_PER_LAYER).fill(null).map(() => null);
    loveAnimationRefsLayer3.current = Array(NUM_LOVE_ANIMATIONS_PER_LAYER).fill(null).map(() => null);
    carrotAnimationRefsInner.current = Array(NUM_CARROT_ANIMATIONS_INNER).fill(null).map(() => null);
    carrotAnimationRefsOuter.current = Array(NUM_CARROT_ANIMATIONS_OUTER).fill(null).map(() => null);
  }, []);


  // Rotation animation for surrounding animations
  useEffect(() => {
    if (showLoveAnimations || showCarrotAnimations) {
      rotationAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotationAnim.stopAnimation();
      rotationAnim.setValue(0);
    }
  }, [showLoveAnimations, showCarrotAnimations, loveLayer]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load total points
    const { data: pointsData } = await supabase
      .from('points_ledger')
      .select('delta_points')
      .eq('user_id', user.id);

    const total = pointsData?.reduce((sum, entry) => sum + entry.delta_points, 0) || 0;
    setTotalPoints(total);

    // Load pet state
    const { data: petData, error: petError } = await supabase
      .from('pet_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (petError && petError.code === 'PGRST116') {
      // Pet state doesn't exist, create it
      const { data: newPetData } = await supabase
        .from('pet_state')
        .insert({
          user_id: user.id,
          pet_level: 1,
          pet_xp: 0,
        })
        .select()
        .single();
      setPetState(newPetData);
    } else {
      setPetState(petData);
    }

    // Load calendar data
    await loadCalendarData();
  }

  async function loadCalendarData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // Load completed tasks for this month
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, completed_at, total_minutes')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString());

    // Load daily assignments to check if all tasks completed
    const { data: assignments } = await supabase
      .from('daily_task_assignments')
      .select('date, task:tasks(id, status)')
      .eq('user_id', user.id)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'));

    const marked: any = {};
    const days = eachDayOfInterval({ start, end });

    days.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTasks = completedTasks?.filter(t => 
        t.completed_at && format(parseISO(t.completed_at), 'yyyy-MM-dd') === dayStr
      ) || [];
      const dayMinutes = dayTasks.reduce((sum, t) => sum + (t.total_minutes || 0), 0);
      const dayAssignments = assignments?.filter(a => a.date === dayStr) || [];
      const allCompleted = dayAssignments.length > 0 && 
        dayAssignments.every(a => (a.task as Task)?.status === 'completed');

      marked[dayStr] = {
        marked: true,
        dotColor: allCompleted ? '#34C759' : '#FF9500',
        customData: {
          tasksCount: dayTasks.length,
          minutes: dayMinutes,
          allCompleted,
        },
      };
    });

    setMarkedDates(marked);
  }

  async function handlePetting() {
    if (totalPoints < 100) {
      Alert.alert('Not enough points', 'You need 100 points to pet your pet');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deduct points
    await supabase
      .from('points_ledger')
      .insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        delta_points: -100,
        reason: 'petting',
      });

    // Update pet XP and level
    const currentXP = petState?.pet_xp || 0;
    const currentLevel = petState?.pet_level || 1;
    const newXP = currentXP + 10;
    const levelUps = Math.floor(newXP / 100);
    const finalXP = newXP % 100;
    const finalLevel = currentLevel + levelUps;

    // Update or create pet state
    if (petState) {
      await supabase
        .from('pet_state')
        .update({
          pet_xp: finalXP,
          pet_level: finalLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('pet_state')
        .insert({
          user_id: user.id,
          pet_xp: finalXP,
          pet_level: finalLevel,
        });
    }

    // Play pet animation first time
    petAnimationRef.current?.play();
    
    // Show first layer (closest) and play
    setShowLoveAnimations(true);
    setLoveLayer(1);
    setTimeout(() => {
      loveAnimationRefsLayer1.current.forEach(ref => ref?.play());
    }, 100);

    // After first layer completes, show second layer
    setTimeout(() => {
      setLoveLayer(2);
      loveAnimationRefsLayer2.current.forEach(ref => ref?.play());
      // Play pet animation second time
      petAnimationRef.current?.play();
    }, 1200); // After ~1.2 seconds (first layer animation duration)

    // After second layer completes, show third layer (outermost)
    setTimeout(() => {
      setLoveLayer(3);
      loveAnimationRefsLayer3.current.forEach(ref => ref?.play());
    }, 2400); // After ~2.4 seconds

    // Hide all animations after completion
    setTimeout(() => {
      setShowLoveAnimations(false);
      setLoveLayer(null);
      loveAnimationRefsLayer1.current.forEach(ref => ref?.reset());
      loveAnimationRefsLayer2.current.forEach(ref => ref?.reset());
      loveAnimationRefsLayer3.current.forEach(ref => ref?.reset());
      petAnimationRef.current?.reset();
      if (levelUps > 0) {
        Alert.alert('Level Up!', `Your pet reached level ${finalLevel}!`);
      }
      loadData();
    }, 3600); // Total duration ~3.6 seconds
  }


  async function handleFeeding() {
    if (totalPoints < 500) {
      Alert.alert('Not enough points', 'You need 500 points to feed your pet');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deduct points
    await supabase
      .from('points_ledger')
      .insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        delta_points: -500,
        reason: 'feeding',
      });

    // Update pet XP and level
    const currentXP = petState?.pet_xp || 0;
    const currentLevel = petState?.pet_level || 1;
    const newXP = currentXP + 50;
    const levelUps = Math.floor(newXP / 100);
    const finalXP = newXP % 100;
    const finalLevel = currentLevel + levelUps;

    // Update or create pet state
    if (petState) {
      await supabase
        .from('pet_state')
        .update({
          pet_xp: finalXP,
          pet_level: finalLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('pet_state')
        .insert({
          user_id: user.id,
          pet_xp: finalXP,
          pet_level: finalLevel,
        });
    }

    // Show carrot animations
    setShowCarrotAnimations(true);
    
    // Play all carrot animations immediately (both inner and outer layers)
    carrotAnimationRefsInner.current.forEach(ref => ref?.play());
    carrotAnimationRefsOuter.current.forEach(ref => ref?.play());
    
    // Play pet animation 5 times
    petAnimationRef.current?.play();
    setTimeout(() => petAnimationRef.current?.play(), 400);
    setTimeout(() => petAnimationRef.current?.play(), 800);
    setTimeout(() => petAnimationRef.current?.play(), 1200);
    setTimeout(() => petAnimationRef.current?.play(), 1600);
    
    // Stop and hide after 10 seconds
    setTimeout(() => {
      setShowCarrotAnimations(false);
      carrotAnimationRefsInner.current.forEach(ref => ref?.reset());
      carrotAnimationRefsOuter.current.forEach(ref => ref?.reset());
      petAnimationRef.current?.reset();
      if (levelUps > 0) {
        Alert.alert('Level Up!', `Your pet reached level ${finalLevel}!`);
      }
      loadData();
    }, 10000); // Total duration: 10 seconds
  }

  async function handleDayPress(day: any) {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);

    // Reload all data to ensure fresh information
    await reloadDayData(dateStr);
  }

  async function reloadDayData(dateStr: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Reload calendar data to get updated day information
    await loadCalendarData();

    // Reload completed tasks for this specific day
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', `${dateStr}T00:00:00`)
      .lte('completed_at', `${dateStr}T23:59:59`);

    setSelectedDayTasks(tasks || []);

    // Reload total points to ensure accuracy
    const { data: pointsData } = await supabase
      .from('points_ledger')
      .select('delta_points')
      .eq('user_id', user.id);

    const total = pointsData?.reduce((sum, entry) => sum + entry.delta_points, 0) || 0;
    setTotalPoints(total);

    // Reload pet state
    const { data: petData, error: petError } = await supabase
      .from('pet_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (petError && petError.code === 'PGRST116') {
      // Pet state doesn't exist, create it
      const { data: newPetData } = await supabase
        .from('pet_state')
        .insert({
          user_id: user.id,
          pet_level: 1,
          pet_xp: 0,
        })
        .select()
        .single();
      setPetState(newPetData);
    } else {
      setPetState(petData);
    }
  }

  function renderDayModal() {
    if (!selectedDate) return null;

    // Get the latest day data from markedDates (which gets refreshed on day press)
    const dayData = markedDates[selectedDate]?.customData;
    const tasks = selectedDayTasks;

    // Calculate actual values from loaded tasks
    const actualTasksCount = tasks.length;
    const actualMinutes = tasks.reduce((sum, t) => sum + (t.total_minutes || 0), 0);

    return (
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>
          {format(parseISO(selectedDate), 'MMMM d, yyyy')}
        </Text>
        <Text style={styles.modalText}>
          Tasks completed: {actualTasksCount}
        </Text>
        <Text style={styles.modalText}>
          Total minutes: {actualMinutes}
        </Text>
        {tasks.length > 0 && (
          <View style={styles.tasksList}>
            <Text style={styles.modalSubtitle}>Completed tasks:</Text>
            {tasks.map(task => (
              <View key={task.id} style={styles.taskItem}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.subtasks_text && (
                  <Text style={styles.subtasksText}>{task.subtasks_text}</Text>
                )}
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            setSelectedDate(null);
            setSelectedDayTasks([]);
          }}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.pointsTitle}>Total Points</Text>
        <Text style={styles.pointsValue}>{totalPoints}</Text>

        <View style={styles.petSection}>
          <Text style={styles.petTitle}>Pet Level {petState?.pet_level || 1}</Text>
          <Text style={styles.petXP}>XP: {petState?.pet_xp || 0}</Text>

          {/* Pet Animation Container */}
          <View style={styles.petAnimationContainer}>
            {/* Pet animation in the center - static until button clicked */}
            <LottieView
              ref={petAnimationRef}
              source={require('../../assets/pet.json')}
              style={styles.petAnimation}
              loop={false}
              autoPlay={false}
            />

            {/* Rotating container for love animations - Layer 1 (closest) */}
            {showLoveAnimations && loveLayer !== null && (
              <Animated.View
                style={[
                  styles.rotatingWrapper,
                  {
                    transform: [
                      {
                        rotate: rotationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {Array.from({ length: NUM_LOVE_ANIMATIONS_PER_LAYER }).map((_, index) => {
                  const angle = (index * 360) / NUM_LOVE_ANIMATIONS_PER_LAYER;
                  const radius = 50; // Closest layer
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <View
                      key={`love-layer1-${index}`}
                      style={[
                        styles.rotatingContainer,
                        {
                          transform: [
                            { translateX: x },
                            { translateY: y },
                          ],
                        },
                      ]}
                    >
                      <LottieView
                        ref={(ref) => (loveAnimationRefsLayer1.current[index] = ref)}
                        source={require('../../assets/love.json')}
                        style={styles.surroundingAnimation}
                        loop={false}
                        autoPlay={false}
                      />
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {/* Rotating container for love animations - Layer 2 (middle) */}
            {showLoveAnimations && loveLayer !== null && loveLayer >= 2 && (
              <Animated.View
                style={[
                  styles.rotatingWrapper,
                  {
                    transform: [
                      {
                        rotate: rotationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {Array.from({ length: NUM_LOVE_ANIMATIONS_PER_LAYER }).map((_, index) => {
                  const angle = (index * 360) / NUM_LOVE_ANIMATIONS_PER_LAYER;
                  const radius = 70; // Middle layer
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <View
                      key={`love-layer2-${index}`}
                      style={[
                        styles.rotatingContainer,
                        {
                          transform: [
                            { translateX: x },
                            { translateY: y },
                          ],
                        },
                      ]}
                    >
                      <LottieView
                        ref={(ref) => (loveAnimationRefsLayer2.current[index] = ref)}
                        source={require('../../assets/love.json')}
                        style={styles.surroundingAnimation}
                        loop={false}
                        autoPlay={false}
                      />
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {/* Rotating container for love animations - Layer 3 (outermost) */}
            {showLoveAnimations && loveLayer === 3 && (
              <Animated.View
                style={[
                  styles.rotatingWrapper,
                  {
                    transform: [
                      {
                        rotate: rotationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {Array.from({ length: NUM_LOVE_ANIMATIONS_PER_LAYER }).map((_, index) => {
                  const angle = (index * 360) / NUM_LOVE_ANIMATIONS_PER_LAYER;
                  const radius = 90; // Outermost layer
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <View
                      key={`love-layer3-${index}`}
                      style={[
                        styles.rotatingContainer,
                        {
                          transform: [
                            { translateX: x },
                            { translateY: y },
                          ],
                        },
                      ]}
                    >
                      <LottieView
                        ref={(ref) => (loveAnimationRefsLayer3.current[index] = ref)}
                        source={require('../../assets/love.json')}
                        style={styles.surroundingAnimation}
                        loop={false}
                        autoPlay={false}
                      />
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {/* Rotating container for carrot animations - Inner layer */}
            {showCarrotAnimations && (
              <Animated.View
                style={[
                  styles.rotatingWrapper,
                  {
                    transform: [
                      {
                        rotate: rotationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {Array.from({ length: NUM_CARROT_ANIMATIONS_INNER }).map((_, index) => {
                  const angle = (index * 360) / NUM_CARROT_ANIMATIONS_INNER;
                  const radius = 70; // Inner layer radius
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <View
                      key={`carrot-inner-${index}`}
                      style={[
                        styles.rotatingContainer,
                        {
                          transform: [
                            { translateX: x },
                            { translateY: y },
                          ],
                        },
                      ]}
                    >
                      <LottieView
                        ref={(ref) => (carrotAnimationRefsInner.current[index] = ref)}
                        source={require('../../assets/carrot.json')}
                        style={styles.surroundingAnimation}
                        loop={true}
                        autoPlay={false}
                      />
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {/* Rotating container for carrot animations - Outer layer */}
            {showCarrotAnimations && (
              <Animated.View
                style={[
                  styles.rotatingWrapper,
                  {
                    transform: [
                      {
                        rotate: rotationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {Array.from({ length: NUM_CARROT_ANIMATIONS_OUTER }).map((_, index) => {
                  const angle = (index * 360) / NUM_CARROT_ANIMATIONS_OUTER;
                  const radius = 120; // Outer layer radius - farther from pet
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <View
                      key={`carrot-outer-${index}`}
                      style={[
                        styles.rotatingContainer,
                        {
                          transform: [
                            { translateX: x },
                            { translateY: y },
                          ],
                        },
                      ]}
                    >
                      <LottieView
                        ref={(ref) => (carrotAnimationRefsOuter.current[index] = ref)}
                        source={require('../../assets/carrot.json')}
                        style={styles.surroundingAnimation}
                        loop={true}
                        autoPlay={false}
                      />
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </View>

          <View style={styles.petActions}>
            <TouchableOpacity
              style={[styles.petButton, totalPoints < 100 && styles.petButtonDisabled]}
              onPress={handlePetting}
              disabled={totalPoints < 100}
            >
              <Text style={styles.petButtonText}>Pet (100 pts)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.petButton, totalPoints < 500 && styles.petButtonDisabled]}
              onPress={handleFeeding}
              disabled={totalPoints < 500}
            >
              <Text style={styles.petButtonText}>Feed (500 pts)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.calendarSection}>
        <Text style={styles.calendarTitle}>Monthly Summary</Text>
        <Calendar
          markedDates={markedDates}
          onDayPress={handleDayPress}
          markingType="custom"
          theme={{
            todayTextColor: theme.colors.primary,
            selectedDayBackgroundColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
            monthTextColor: theme.colors.text,
            textDayFontWeight: '400',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '600',
          }}
        />
      </View>

      {selectedDate && renderDayModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  pointsTitle: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 24,
  },
  petSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
  },
  petTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  petXP: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  petAnimationContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
    position: 'relative',
    overflow: 'visible',
  },
  petAnimation: {
    width: 150,
    height: 150,
    zIndex: 10,
  },
  rotatingWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotatingContainer: {
    position: 'absolute',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surroundingAnimation: {
    width: 50,
    height: 50,
    zIndex: 0,
  },
  carrotMovingContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carrotAnimation: {
    width: 60,
    height: 60,
    zIndex: 0,
  },
  petActions: {
    flexDirection: 'row',
    gap: 12,
  },
  petButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  petButtonDisabled: {
    opacity: 0.5,
  },
  petButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.shadows.md,
  },
  calendarTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  tasksList: {
    marginTop: 8,
  },
  taskItem: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  taskTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtasksText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.sm,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

