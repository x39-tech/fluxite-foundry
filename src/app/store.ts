import { configureStore } from "@reduxjs/toolkit";
import { throttle } from "lodash";
import appSettings from "features/appSettings/appSettingsSlice";
import editors from "features/deviceClassEditor/deviceClassEditorSlice";
import {
  loadStateFromLocalStorage,
  saveStateToLocalStorage,
} from "utils/localStorage";
import { RootState } from "./rootState";

const store = configureStore<RootState>({
  reducer: {
    appSettings,
    editors,
  },
  preloadedState: loadStateFromLocalStorage(),
});

store.subscribe(
  throttle(() => {
    saveStateToLocalStorage(store.getState());
  }, 1000)
);

export default store;

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
