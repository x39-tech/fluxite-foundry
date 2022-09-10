import { createSlice } from "@reduxjs/toolkit";
import { defaultAppSettings } from "./appSettingsState";

export const appSettingsSlice = createSlice({
  name: "appSettings",
  initialState: defaultAppSettings(),
  reducers: {
    darkModeToggled(state) {
      state.darkMode = !state.darkMode;
    },
    threeDViewToggled(state) {
      state.threeDViewEnabled = !state.threeDViewEnabled;
    },
  },
});

export const { darkModeToggled, threeDViewToggled } = appSettingsSlice.actions;

export default appSettingsSlice.reducer;
