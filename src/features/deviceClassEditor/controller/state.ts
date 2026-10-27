import { EntityId } from "app/persistentState";
import { DmxControllerLayout } from "app/runtimeState";
import { resolveDmxSerializerId } from "../dmxEditor/modes";
import {
  updateEditorRuntimeState,
  useEditorRuntimeField,
} from "../runtimeState";
import { useCurrentEditorId, useCurrentEditorPart } from "../state";

export const DEFAULT_DMX_CONTROLLER_LAYOUT: DmxControllerLayout = "horizontal";

export function useDmxControllerLayout(
  documentId: EntityId | undefined,
): DmxControllerLayout {
  return (
    useEditorRuntimeField(documentId, "dmxControllerLayout") ??
    DEFAULT_DMX_CONTROLLER_LAYOUT
  );
}

export function setDmxControllerLayout(
  documentId: EntityId,
  layout: DmxControllerLayout,
) {
  updateEditorRuntimeState(documentId, (state) => {
    state.dmxControllerLayout = layout;
  });
}

/**
 * The ID of the serializer the test controller is built from. undefined if the
 * document has no serializers.
 */
export function useControllerDmxSerializerId(): EntityId | undefined {
  const documentId = useCurrentEditorId();
  const selectedId = useEditorRuntimeField(
    documentId,
    "dmxControllerSerializer",
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
  updateEditorRuntimeState(documentId, (state) => {
    state.dmxControllerSerializer = serializerId;
  });
}
