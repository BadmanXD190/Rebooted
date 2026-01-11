import { supabase } from './supabase';
import { UserPreferences, Task, DailyTaskAssignment } from '../types/database';
import { format } from 'date-fns';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// List of entertainment app package names to block
const BLOCKED_PACKAGES = [
  'com.google.android.youtube', // YouTube
  'com.netflix.mediaclient', // Netflix
  'com.spotify.music', // Spotify
  'com.instagram.android', // Instagram
  'com.facebook.katana', // Facebook
  'com.twitter.android', // Twitter/X
  'com.snapchat.android', // Snapchat
  'com.tiktok.android', // TikTok
  'com.reddit.frontpage', // Reddit
  'com.disney.disneyplus', // Disney+
  'com.amazon.avod.thirdpartyclient', // Prime Video
  'com.hulu.plus', // Hulu
];

/**
 * Evaluates if blocking should be active based on:
 * - Current time vs sleep_time
 * - Today's assigned tasks completion status
 */
export async function shouldBlockApps(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('sleep_time, android_blocking_enabled')
    .eq('user_id', user.id)
    .single();

  if (!preferences || !preferences.android_blocking_enabled) {
    return false; // Blocking disabled
  }

  // Check if after sleep time
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  const sleepTime = preferences.sleep_time;

  if (currentTime >= sleepTime) {
    return true; // After sleep time, block apps
  }

  // Check if there are unfinished assigned tasks for today
  const today = format(now, 'yyyy-MM-dd');
  const { data: assignments } = await supabase
    .from('daily_task_assignments')
    .select(`
      *,
      task:tasks(status)
    `)
    .eq('user_id', user.id)
    .eq('date', today);

  if (!assignments || assignments.length === 0) {
    return false; // No assignments, don't block
  }

  // Check if all tasks are completed
  const allCompleted = assignments.every(
    (a: DailyTaskAssignment & { task: Task }) => 
      (a.task as Task)?.status === 'completed'
  );

  return !allCompleted; // Block if not all tasks completed
}

/**
 * Updates blocking status in Android SharedPreferences
 * This is called whenever blocking status changes
 */
export async function updateBlockingStatus(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const isBlocking = await shouldBlockApps();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get user preferences for sleep time
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('sleep_time')
    .eq('user_id', user.id)
    .single();

  // Check if there are incomplete tasks
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: assignments } = await supabase
    .from('daily_task_assignments')
    .select(`
      *,
      task:tasks(status)
    `)
    .eq('user_id', user.id)
    .eq('date', today);

  const hasIncompleteTasks = assignments && assignments.length > 0 && 
    !assignments.every(
      (a: DailyTaskAssignment & { task: Task }) => 
        (a.task as Task)?.status === 'completed'
    );

  // Store blocking status in AsyncStorage (will be synced to native via module)
  await AsyncStorage.setItem('rebooted_blocking_enabled', isBlocking ? 'true' : 'false');
  await AsyncStorage.setItem('rebooted_sleep_time', preferences?.sleep_time || '23:00');
  await AsyncStorage.setItem('rebooted_has_incomplete_tasks', hasIncompleteTasks ? 'true' : 'false');
  
  // Store blocked packages list
  await AsyncStorage.setItem('rebooted_blocked_packages', JSON.stringify(BLOCKED_PACKAGES));

  // Call native module to update SharedPreferences
  if (Platform.OS === 'android') {
    try {
      const { RebootedBlockingModule } = require('../modules/RebootedBlockingModule');
      if (RebootedBlockingModule) {
        console.log('[Blocking] Updating blocking status:', {
          enabled: isBlocking,
          sleepTime: preferences?.sleep_time || '23:00',
          hasIncompleteTasks: hasIncompleteTasks,
        });
        await RebootedBlockingModule.updateBlockingStatus({
          enabled: isBlocking,
          sleepTime: preferences?.sleep_time || '23:00',
          blockedPackages: BLOCKED_PACKAGES,
          hasIncompleteTasks: hasIncompleteTasks,
        });
        console.log('[Blocking] Status updated successfully');
      } else {
        console.warn('[Blocking] Native module not available');
      }
    } catch (error) {
      console.error('[Blocking] Error updating status:', error);
    }
  }
}

/**
 * Gets the list of blocked app packages
 */
export function getBlockedPackages(): string[] {
  return BLOCKED_PACKAGES;
}

