// Handle application settings that are stored in and flushed from local storage
// TODO: make more robust, add tests

export interface AppSettings {
  darkMode: boolean;
}

export function defaultAppSettings(): AppSettings {
  return {
    darkMode: getDefaultDarkModePreference(),
  };
}

function getDefaultDarkModePreference(): boolean {
  // Check to see if Media-Queries are supported
  if (window.matchMedia) {
    // Check if the dark-mode Media-Query matches
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return true;
    } else {
      return false;
    }
  }
  return false;
}
