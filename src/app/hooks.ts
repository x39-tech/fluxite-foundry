import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { RootState } from "./rootState";
import { DeviceClassEditorState } from "features/deviceClassEditor/deviceClassEditorState";
import type { AppDispatch } from "./store";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useCurrentEditorSelector<ReturnedValue>(
  selector: (state: DeviceClassEditorState) => ReturnedValue
) {
  return useAppSelector((state) =>
    selector(state.editors.openEditors[state.editors.selectedEditor])
  );
}
