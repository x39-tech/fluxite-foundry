// Handle application settings that are stored in and flushed from local storage
// TODO: make more robust, add tests

export interface AppSettings {
  darkMode: boolean;
  threeDViewEnabled: boolean;
}

export function defaultAppSettings(): AppSettings {
  return {
    darkMode: false,
    threeDViewEnabled: false,
  };
}
