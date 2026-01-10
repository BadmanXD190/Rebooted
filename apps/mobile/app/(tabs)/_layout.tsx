import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      {/* Hide all other screens from tab bar */}
      <Tabs.Screen
        name="task-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="add-task-to-today"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="swap-task"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="project-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="add-project"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="add-task"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-project"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-task"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="completed-projects"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

