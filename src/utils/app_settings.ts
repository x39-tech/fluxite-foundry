// Handle application settings that are stored in and flushed from local storage

// TODO: make more robust, add tests

export interface AppSettings {
  darkMode: boolean;
  threeDViewEnabled: boolean;
}

export const defaultAppSettings: AppSettings = {
  darkMode: false,
  threeDViewEnabled: false,
};

export function loadAppSettings(): AppSettings {
  const settings = localStorage.getItem("settings");
  if (!settings) {
    return defaultAppSettings;
  }

  try {
    return JSON.parse(settings);
  } catch (err) {
    return defaultAppSettings;
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}
