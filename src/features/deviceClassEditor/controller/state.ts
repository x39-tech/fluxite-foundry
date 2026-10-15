import { EntityId } from "app/persistentState";
import { DmxControllerLayout } from "app/runtimeState";
import { updateAppRuntimeState, useAppRuntimeStore } from "app/store";

export const DEFAULT_DMX_CONTROLLER_LAYOUT: DmxControllerLayout = "horizontal";

export function useDmxControllerLayout(
  documentId: EntityId | undefined,
): DmxControllerLayout {
  return useAppRuntimeStore(
    (state) =>
      (documentId && state.dmxControllerLayouts[documentId]) ||
      DEFAULT_DMX_CONTROLLER_LAYOUT,
  );
}

export function setDmxControllerLayout(
  documentId: EntityId,
  layout: DmxControllerLayout,
) {
  updateAppRuntimeState((state) => {
    state.dmxControllerLayouts[documentId] = layout;
  });
}
