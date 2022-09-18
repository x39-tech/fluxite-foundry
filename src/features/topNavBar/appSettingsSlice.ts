import { createSlice } from "@reduxjs/toolkit";
import { defaultAppSettings } from "./appSettingsState";

export const appSettingsSlice = createSlice({
  name: "appSettings",
  initialState: defaultAppSettings(),
  reducers: {
    darkModeToggled(state) {
      state.darkMode = !state.darkMode;
    },
  },
});

export const { darkModeToggled } = appSettingsSlice.actions;

export default appSettingsSlice.reducer;
