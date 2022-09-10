import { RootState } from "app/rootState";
import { ROOT_STATE_SCHEMA } from "generated/hash";

export function loadStateFromLocalStorage(): RootState | undefined {
  try {
    const hash = localStorage.getItem("prelimStateHash");
    if (!hash || hash !== ROOT_STATE_SCHEMA) {
      return undefined;
    }

    const state = localStorage.getItem("prelimRootState");
    if (!state) {
      return undefined;
    }

    return JSON.parse(state);
  } catch (err) {
    return undefined;
  }
}

export function saveStateToLocalStorage(state: RootState) {
  try {
    localStorage.clear();
    localStorage.setItem("prelimRootState", JSON.stringify(state));
    localStorage.setItem("prelimStateHash", ROOT_STATE_SCHEMA);
  } catch (err) {
    console.log("State save error: " + err);
  }
  console.log("State saved");
}
