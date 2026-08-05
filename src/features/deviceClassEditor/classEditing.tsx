// Context provider for editing classes in a Device Class's Device Library.

import { ReactNode } from "react";
import { CodexId, EntityId } from "app/persistentState";
import {
  ClassEditingApi,
  ClassEditingProvider,
  ReferenceableClassKind,
} from "features/classEditors/context";
import { useAppPersistentStore } from "app/store";
import {
  getCurrentEditor,
  updateCurrentEditor,
  useDeviceLibrary,
  useSourceLocale,
} from "./state";
import { deviceClassLocalizer } from "./localizationRegistry";

// Which instance table can hold a class of each referenceable kind open.
const INSTANCE_TABLES = {
  parameterClasses: "parameters",
  resourceClasses: "resources",
  commandClasses: "commands",
} as const;

function getClassUsage(
  kind: ReferenceableClassKind,
  classId: EntityId,
): CodexId[] {
  const editor = getCurrentEditor(useAppPersistentStore.getState());
  if (!editor) {
    return [];
  }

  return Object.values(editor[INSTANCE_TABLES[kind]])
    .filter((item) => item.class.type === "local" && item.class.id === classId)
    .map((item) => item.codexId);
}

const DEVICE_CLASS_CLASS_EDITING: ClassEditingApi = {
  useLibrary: useDeviceLibrary,
  useSourceLocale,
  getClassUsage,
  update: (label, recipe) =>
    updateCurrentEditor(label, (editor) =>
      recipe(editor, deviceClassLocalizer(editor)),
    ),
};

/** Mounts the class editors against the device class being edited. */
export const DeviceClassClassEditing = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <ClassEditingProvider api={DEVICE_CLASS_CLASS_EDITING}>
      {children}
    </ClassEditingProvider>
  );
};
