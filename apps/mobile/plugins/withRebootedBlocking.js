const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withRebootedBlocking(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      manifest.application = [{}];
    }

    const application = manifest.application[0];
    
    // Add BlockActivity
    if (!application.activity) {
      application.activity = [];
    }
    
    // Check if BlockActivity already exists
    const hasBlockActivity = application.activity.some(
      (act) => act.$['android:name'] === '.BlockActivity'
    );
    
    if (!hasBlockActivity) {
      const blockActivity = {
        $: {
          'android:name': '.BlockActivity',
          'android:theme': '@android:style/Theme.Black.NoTitleBar.Fullscreen',
          'android:launchMode': 'singleTask',
          'android:excludeFromRecents': 'true',
          'android:exported': 'false',
        },
      };
      application.activity.push(blockActivity);
    }

    // Add Accessibility Service
    if (!application.service) {
      application.service = [];
    }

    // Check if service already exists
    const hasAccessibilityService = application.service.some(
      (svc) => svc.$['android:name'] === '.BlockAccessibilityService'
    );

    if (!hasAccessibilityService) {
      const accessibilityService = {
        $: {
          'android:name': '.BlockAccessibilityService',
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.accessibilityservice.AccessibilityService',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice',
              'android:resource': '@xml/accessibility_service_config',
            },
          },
        ],
      };

      application.service.push(accessibilityService);
    }

    // Add QUERY_ALL_PACKAGES permission
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const hasQueryPermission = manifest['uses-permission'].some(
      (p) => p.$ && p.$['android:name'] === 'android.permission.QUERY_ALL_PACKAGES'
    );

    if (!hasQueryPermission) {
      const queryPermission = {
        $: {
          'android:name': 'android.permission.QUERY_ALL_PACKAGES',
        },
      };
      manifest['uses-permission'].push(queryPermission);
    }

    return config;
  });
};

