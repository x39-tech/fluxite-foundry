// Handle application settings that are stored in and flushed from local storage
// TODO: make more robust, add tests

export interface AppSettings {
  darkMode: boolean;
  threeDViewEnabled: boolean;
  // TODO: figure out the correct typescript incantations in loadAppSettings below
  // to avoid having to add this member
  [key: string]: any;
}

export function defaultAppSettings(): AppSettings {
  return {
    darkMode: false,
    threeDViewEnabled: false,
  };
}

export function loadAppSettings(): AppSettings {
  const settings = localStorage.getItem("settings");
  if (!settings) {
    return defaultAppSettings();
  }

  try {
    const parsedSettings = JSON.parse(settings);
    let toReturn: AppSettings = defaultAppSettings();
    for (const [key, value] of Object.entries(parsedSettings)) {
      if (key in toReturn) {
        const castedKey = key as keyof AppSettings;
        if (typeof toReturn[castedKey] == typeof value) {
          toReturn[castedKey] = value;
        }
      }
    }
    return toReturn;
  } catch (err) {
    return defaultAppSettings();
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}
