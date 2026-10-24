import { EntityId } from "app/persistentState";
import { DmxControllerLayout } from "app/runtimeState";
import { updateAppRuntimeState, useAppRuntimeStore } from "app/store";
import { resolveDmxSerializerId } from "../dmxEditor/modes";
import { useCurrentEditorId, useCurrentEditorPart } from "../state";

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

/**
 * The ID of the serializer the test controller is built from. undefined if the
 * document has no serializers.
 */
export function useControllerDmxSerializerId(): EntityId | undefined {
  const documentId = useCurrentEditorId();
  const selectedId = useAppRuntimeStore((state) =>
    documentId ? state.dmxControllerSerializers[documentId] : undefined,
  );
  return useCurrentEditorPart((editor) =>
    resolveDmxSerializerId(editor.dmxSerializers, selectedId),
  );
}

/** Selects the serializer that a document's test controller is built from. */
export function selectControllerDmxSerializer(
  documentId: EntityId,
  serializerId: EntityId,
) {
  updateAppRuntimeState((state) => {
    state.dmxControllerSerializers[documentId] = serializerId;
  });
}
