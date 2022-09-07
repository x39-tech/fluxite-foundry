import { configureStore } from "@reduxjs/toolkit";
import appSettings from "features/appSettings/appSettingsSlice";
import fixtureEditor from "features/fixtureEditor/fixtureEditorSlice";

const store = configureStore({
  reducer: {
    appSettings,
    fixtureEditor,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
