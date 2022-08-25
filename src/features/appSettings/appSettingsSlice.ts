import { createSlice } from "@reduxjs/toolkit";
import { loadAppSettings, saveAppSettings } from "./appSettings";

const initialState = loadAppSettings();

export const appSettingsSlice = createSlice({
  name: "appSettings",
  initialState,
  reducers: {
    darkModeToggled(state) {
      state.darkMode = !state.darkMode;
      saveAppSettings(state);
    },
    threeDViewToggled(state) {
      state.threeDViewEnabled = !state.threeDViewEnabled;
      saveAppSettings(state);
    },
  },
});

export const { darkModeToggled, threeDViewToggled } = appSettingsSlice.actions;

export default appSettingsSlice.reducer;
