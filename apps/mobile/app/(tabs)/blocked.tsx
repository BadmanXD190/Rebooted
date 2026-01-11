import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../constants/theme';

export default function BlockedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const appName = params.appName as string || 'This app';

  function handleClose() {
    // Navigate to Rebooted home page
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.blockedText}>Blocked</Text>
        <Text style={styles.appNameText}>{appName} is blocked</Text>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.8}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    alignItems: 'flex-start',
  },
  blockedText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 8,
  },
  appNameText: {
    fontSize: 18,
    color: '#E0E0E0',
    marginBottom: 40,
  },
  closeButton: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

