import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && !inAuthGroup) {
      // Redirect to auth if not logged in
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Check if user has preferences (onboarding check)
      checkOnboarding();
    } else if (session && !inTabsGroup && !inAuthGroup) {
      // Redirect to tabs if logged in
      router.replace('/(tabs)/home');
    }
  }, [session, segments, loading]);

  async function checkOnboarding() {
    if (!session) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();

    if (!data) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(tabs)/home');
    }
  }

  if (loading) {
    return null; // Or a loading screen
  }

  return <Slot />;
}

