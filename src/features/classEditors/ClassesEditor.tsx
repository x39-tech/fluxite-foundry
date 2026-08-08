// Edit item classes

import { useState } from "react";
import { toast } from "sonner";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { EntityId } from "app/persistentState";
import { useAuthoringLocale } from "app/store";
import {
  formatCategoryPath,
  localizeCategoryPath,
  splitParameterClassId,
} from "codex/categories";
import { useCategoryCatalog } from "hooks/useCategoryCatalog";
import { ItemEditor } from "utils/utils";
import { ListItemsEditor } from "components/ListItemsEditor";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "components/scn-ui/Tabs";
import {
  ClassKind,
  classKinds,
  isReferenceableKind,
  useClassEditing,
} from "./context";
import { useClassEditors, useClassOperations } from "./state";
import { CLASS_IN_USE_MESSAGES, CLASS_KIND_MESSAGES } from "./messages";
import { NewClassDialog } from "./NewClassDialog";
import { ParameterClassEditor } from "./ParameterClassEditor";
import { StructureClassEditor } from "./StructureClassEditor";
import { SerializerClassEditor } from "./SerializerClassEditor";
import { ResourceClassEditor } from "./ResourceClassEditor";
import { CommandClassEditor } from "./CommandClassEditor";

const TABS_LABEL = msg({ id: "classes.tabs.label", message: "Class kind" });

export const ClassesEditor = () => {
  const [kind, setKind] = useState<ClassKind>(classKinds.PARAMETER);
  const { _ } = useLingui();

  return (
    <Tabs
      value={kind}
      onValueChange={(value) => setKind(value as ClassKind)}
      className="h-full overflow-hidden"
    >
      <TabsList className="m-2 self-start" aria-label={_(TABS_LABEL)}>
        {Object.values(classKinds).map((candidate) => (
          <TabsTrigger key={candidate} value={candidate} className="p-2">
            {_(CLASS_KIND_MESSAGES[candidate].tabTitle)}
          </TabsTrigger>
        ))}
      </TabsList>
      {Object.values(classKinds).map((candidate) => (
        <TabsContent
          key={candidate}
          value={candidate}
          className="min-h-0"
          forceMount
          hidden={candidate !== kind}
        >
          <ClassKindPanel kind={candidate} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

interface ClassKindPanelProps {
  kind: ClassKind;
}

// ListItemsEditor for one specific kind of classes.
const ClassKindPanel = ({ kind }: ClassKindPanelProps) => {
  const [newClassDialogIsOpen, setNewClassDialogIsOpen] = useState(false);

  const editors = useClassEditors(kind);
  const operations = useClassOperations();
  const { getClassUsage } = useClassEditing();
  const catalog = useCategoryCatalog();
  const locale = useAuthoringLocale();
  const { _ } = useLingui();

  // Parameter Classes get special handling due to categories:
  // - They have the raw ID as a title and the localized category as a subtitle
  // - They reconstruct the full CodexId to be searched on using getEditorSearchText.
  const categorized = kind === classKinds.PARAMETER;

  const classIdentifier = (editor: ItemEditor): string =>
    categorized
      ? splitParameterClassId(editor.codexId).identifier
      : editor.codexId;

  const categoryPath = (editor: ItemEditor): string | undefined => {
    const { category } = splitParameterClassId(editor.codexId);
    if (!category) return undefined;

    return formatCategoryPath(
      localizeCategoryPath(catalog.localizations, category, locale),
    );
  };

  const classSearchText = (editor: ItemEditor): string =>
    [editor.codexId, categoryPath(editor)]
      .filter((text) => text !== undefined)
      .join(" ");

  // Prevents delete for classes that still have items referencing them.
  const deleteClass = (editor: ItemEditor): boolean => {
    if (isReferenceableKind(kind)) {
      const referrers = getClassUsage(kind, editor.id);
      if (referrers.length > 0) {
        toast(
          _({
            ...CLASS_IN_USE_MESSAGES[kind],
            values: {
              codexId: editor.codexId,
              referrers: referrers.join(", "),
            },
          }),
        );
        return false;
      }
    }

    operations.deleteClass(kind, editor.id);
    return true;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0">
        <ListItemsEditor
          editors={editors}
          labels={CLASS_KIND_MESSAGES[kind].list}
          getEditorTitle={classIdentifier}
          getEditorSubtitle={categorized ? categoryPath : undefined}
          getEditorSearchText={categorized ? classSearchText : undefined}
          onAddItem={() => setNewClassDialogIsOpen(true)}
          onDeleteItem={deleteClass}
          renderActiveEditor={(editor) => (
            <ClassEditor kind={kind} id={editor.id} />
          )}
        />
      </div>
      <NewClassDialog
        kind={kind}
        isOpen={newClassDialogIsOpen}
        onClose={() => setNewClassDialogIsOpen(false)}
      />
    </div>
  );
};

interface ClassEditorProps {
  kind: ClassKind;
  id: EntityId;
}

const ClassEditor = ({ kind, id }: ClassEditorProps) => {
  switch (kind) {
    case classKinds.PARAMETER:
      return <ParameterClassEditor id={id} />;
    case classKinds.STRUCTURE:
      return <StructureClassEditor id={id} />;
    case classKinds.SERIALIZER:
      return <SerializerClassEditor id={id} />;
    case classKinds.RESOURCE:
      return <ResourceClassEditor id={id} />;
    case classKinds.COMMAND:
      return <CommandClassEditor id={id} />;
  }
};
