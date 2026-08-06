// Edit item classes

import { useState } from "react";
import { toast } from "sonner";
import { EntityId } from "app/persistentState";
import { useCurrentLocale } from "app/store";
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
  type ReferenceableClassKind,
  useClassEditing,
} from "./context";
import { CLASS_KIND_NAMES, useClassEditors, useClassOperations } from "./state";
import { NewClassDialog } from "./NewClassDialog";
import { ParameterClassEditor } from "./ParameterClassEditor";
import { StructureClassEditor } from "./StructureClassEditor";
import { SerializerClassEditor } from "./SerializerClassEditor";
import { ResourceClassEditor } from "./ResourceClassEditor";
import { CommandClassEditor } from "./CommandClassEditor";

const KIND_LABELS: Record<ClassKind, string> = {
  parameterClasses: "Parameter",
  structureClasses: "Structure",
  serializerClasses: "Serializer",
  resourceClasses: "Resource",
  commandClasses: "Command",
};

const REFERRER_NAMES: Record<ReferenceableClassKind, string> = {
  parameterClasses: "parameter",
  resourceClasses: "resource",
  commandClasses: "command",
};

export const ClassesEditor = () => {
  const [kind, setKind] = useState<ClassKind>(classKinds.PARAMETER);

  return (
    <Tabs
      value={kind}
      onValueChange={(value) => setKind(value as ClassKind)}
      className="h-full overflow-hidden"
    >
      <TabsList className="m-2 self-start" aria-label="Class kind">
        {Object.values(classKinds).map((candidate) => (
          <TabsTrigger key={candidate} value={candidate} className="p-2">
            {KIND_LABELS[candidate]}
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
  const locale = useCurrentLocale();

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
          `${CLASS_KIND_NAMES[kind]} ${editor.codexId} is in use. Remove it from ${listReferrers(referrers, REFERRER_NAMES[kind])} first.`,
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
          itemType={CLASS_KIND_NAMES[kind]}
          getEditorTitle={classIdentifier}
          getEditorSubtitle={categorized ? categoryPath : undefined}
          getEditorSearchText={categorized ? classSearchText : undefined}
          searchPlaceholder={`Search ${CLASS_KIND_NAMES[kind]}es...`}
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

function listReferrers(referrers: string[], referrerName: string): string {
  const plural = referrers.length === 1 ? referrerName : `${referrerName}s`;
  return `the ${plural} ${referrers.join(", ")}`;
}

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
