// Side-effect module imported first by the JS entry (index.ts), before expo-router.
// Background work (geofence task, Android widget task handler) can start a headless JS
// runtime that never renders the root layout, so task definitions must live here.
import { defineGeofenceTask } from './geofence';
import { registerWidgets } from './register-widgets';

defineGeofenceTask();
registerWidgets();
