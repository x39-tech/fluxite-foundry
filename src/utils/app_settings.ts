// Handle application settings that are stored in and flushed from local storage

// TODO: make more robust, add tests

export class AppSettings {
  darkMode = false;
  threeDViewEnabled = false;
  [key: string]: any;
}

export function loadAppSettings(): AppSettings {
  const settings = localStorage.getItem("settings");
  if (!settings) {
    return new AppSettings();
  }

  try {
    const parsedSettings = JSON.parse(settings);
    const toReturn = new AppSettings();
    for (const [key, value] of Object.entries(parsedSettings)) {
      if (key in toReturn && typeof toReturn[key] === typeof value) {
        toReturn[key] = value;
      }
    }
    return toReturn;
  } catch (err) {
    return new AppSettings();
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}
