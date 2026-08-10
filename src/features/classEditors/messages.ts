// Localization message constants for item classes.

import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { ListItemsEditorLabels } from "components/ListItemsEditor";
import { ClassKind, ReferenceableClassKind } from "./context";
import type { CommandMemberKind } from "./state";

/** All the ways the UI refers to one type of item class. */
export interface ClassKindMessages {
  /** The tab name that selects this kind, e.g. "Parameter". */
  tabTitle: MessageDescriptor;
  /** Strings to supply to the list of these classes. */
  list: ListItemsEditorLabels;
  /** Title of the dialog that creates one, e.g. "New Parameter Class". */
  newDialogTitle: MessageDescriptor;
  /** Description under that title. */
  newDialogDescription: MessageDescriptor;
  /** Displayed to the user when the ID they entered is already in use. */
  duplicateId: MessageDescriptor;
  /** What the undo menu calls adding, changing and removing one of these. */
  undoAdd: MessageDescriptor;
  undoEdit: MessageDescriptor;
  undoDelete: MessageDescriptor;
}

export const CLASS_KIND_MESSAGES: Record<ClassKind, ClassKindMessages> = {
  parameterClasses: {
    tabTitle: msg({
      id: "itemClasses.parameterClasses.tabTitle",
      message: "Parameter",
    }),
    list: {
      add: msg({
        id: "itemClasses.parameterClasses.list.add",
        message: "Add Parameter Class",
      }),
      delete: msg({
        id: "itemClasses.parameterClasses.list.delete",
        message: "Delete Parameter Class",
      }),
      search: msg({
        id: "itemClasses.parameterClasses.list.search",
        message: "Search Parameter Classes",
      }),
      emptyState: msg({
        id: "itemClasses.parameterClasses.list.emptyState",
        message: "Add a parameter class to start editing",
      }),
      selectPrompt: msg({
        id: "itemClasses.parameterClasses.list.selectPrompt",
        message: "Select a parameter class to start editing",
      }),
    },
    newDialogTitle: msg({
      id: "itemClasses.parameterClasses.newDialog.title",
      message: "New Parameter Class",
    }),
    newDialogDescription: msg({
      id: "itemClasses.parameterClasses.newDialog.description",
      message:
        "Create a new parameter class by providing a category, an ID and a name",
    }),
    duplicateId: msg({
      id: "itemClasses.parameterClasses.duplicateId",
      message: "A parameter class with the ID {codexId} already exists.",
    }),
    undoAdd: msg({
      id: "itemClasses.parameterClasses.undo.add",
      message: "Add Parameter Class",
    }),
    undoEdit: msg({
      id: "itemClasses.parameterClasses.undo.edit",
      message: "Edit Parameter Class",
    }),
    undoDelete: msg({
      id: "itemClasses.parameterClasses.undo.delete",
      message: "Delete Parameter Class",
    }),
  },

  structureClasses: {
    tabTitle: msg({
      id: "itemClasses.structureClasses.tab",
      message: "Structure",
    }),
    list: {
      add: msg({
        id: "itemClasses.structureClasses.list.add",
        message: "Add Structure Class",
      }),
      delete: msg({
        id: "itemClasses.structureClasses.list.delete",
        message: "Delete Structure Class",
      }),
      search: msg({
        id: "itemClasses.structureClasses.list.search",
        message: "Search Structure Classes",
      }),
      emptyState: msg({
        id: "itemClasses.structureClasses.list.emptyState",
        message: "Add a structure class to start editing",
      }),
      selectPrompt: msg({
        id: "itemClasses.structureClasses.list.selectPrompt",
        message: "Select a structure class to start editing",
      }),
    },
    newDialogTitle: msg({
      id: "itemClasses.structureClasses.newDialog.title",
      message: "New Structure Class",
    }),
    newDialogDescription: msg({
      id: "itemClasses.structureClasses.newDialog.description",
      message: "Create a new structure class by providing an ID and a name",
    }),
    duplicateId: msg({
      id: "itemClasses.structureClasses.duplicateId",
      message: "A structure class with the ID {codexId} already exists.",
    }),
    undoAdd: msg({
      id: "itemClasses.structureClasses.undo.add",
      message: "Add Structure Class",
    }),
    undoEdit: msg({
      id: "itemClasses.structureClasses.undo.edit",
      message: "Edit Structure Class",
    }),
    undoDelete: msg({
      id: "itemClasses.structureClasses.undo.delete",
      message: "Delete Structure Class",
    }),
  },

  serializerClasses: {
    tabTitle: msg({
      id: "itemClasses.serializerClasses.tab",
      message: "Serializer",
    }),
    list: {
      add: msg({
        id: "itemClasses.serializerClasses.list.add",
        message: "Add Serializer Class",
      }),
      delete: msg({
        id: "itemClasses.serializerClasses.list.delete",
        message: "Delete Serializer Class",
      }),
      search: msg({
        id: "itemClasses.serializerClasses.list.search",
        message: "Search Serializer Classes",
      }),
      emptyState: msg({
        id: "itemClasses.serializerClasses.list.emptyState",
        message: "Add a serializer class to start editing",
      }),
      selectPrompt: msg({
        id: "itemClasses.serializerClasses.list.selectPrompt",
        message: "Select a serializer class to start editing",
      }),
    },
    newDialogTitle: msg({
      id: "itemClasses.serializerClasses.newDialog.title",
      message: "New Serializer Class",
    }),
    newDialogDescription: msg({
      id: "itemClasses.serializerClasses.newDialog.description",
      message: "Create a new serializer class by providing an ID and a name",
    }),
    duplicateId: msg({
      id: "itemClasses.serializerClasses.duplicateId",
      message: "A serializer class with the ID {codexId} already exists.",
    }),
    undoAdd: msg({
      id: "itemClasses.serializerClasses.undo.add",
      message: "Add Serializer Class",
    }),
    undoEdit: msg({
      id: "itemClasses.serializerClasses.undo.edit",
      message: "Edit Serializer Class",
    }),
    undoDelete: msg({
      id: "itemClasses.serializerClasses.undo.delete",
      message: "Delete Serializer Class",
    }),
  },

  resourceClasses: {
    tabTitle: msg({
      id: "itemClasses.resourceClasses.tab",
      message: "Resource",
    }),
    list: {
      add: msg({
        id: "itemClasses.resourceClasses.list.add",
        message: "Add Resource Class",
      }),
      delete: msg({
        id: "itemClasses.resourceClasses.list.delete",
        message: "Delete Resource Class",
      }),
      search: msg({
        id: "itemClasses.resourceClasses.list.search",
        message: "Search Resource Classes",
      }),
      emptyState: msg({
        id: "itemClasses.resourceClasses.list.emptyState",
        message: "Add a resource class to start editing",
      }),
      selectPrompt: msg({
        id: "itemClasses.resourceClasses.list.selectPrompt",
        message: "Select a resource class to start editing",
      }),
    },
    newDialogTitle: msg({
      id: "itemClasses.resourceClasses.newDialog.title",
      message: "New Resource Class",
    }),
    newDialogDescription: msg({
      id: "itemClasses.resourceClasses.newDialog.description",
      message: "Create a new resource class by providing an ID and a name",
    }),
    duplicateId: msg({
      id: "itemClasses.resourceClasses.duplicateId",
      message: "A resource class with the ID {codexId} already exists.",
    }),
    undoAdd: msg({
      id: "itemClasses.resourceClasses.undo.add",
      message: "Add Resource Class",
    }),
    undoEdit: msg({
      id: "itemClasses.resourceClasses.undo.edit",
      message: "Edit Resource Class",
    }),
    undoDelete: msg({
      id: "itemClasses.resourceClasses.undo.delete",
      message: "Delete Resource Class",
    }),
  },

  commandClasses: {
    tabTitle: msg({ id: "itemClasses.commandClasses.tab", message: "Command" }),
    list: {
      add: msg({
        id: "itemClasses.commandClasses.list.add",
        message: "Add Command Class",
      }),
      delete: msg({
        id: "itemClasses.commandClasses.list.delete",
        message: "Delete Command Class",
      }),
      search: msg({
        id: "itemClasses.commandClasses.list.search",
        message: "Search Command Classes",
      }),
      emptyState: msg({
        id: "itemClasses.commandClasses.list.emptyState",
        message: "Add a command class to start editing",
      }),
      selectPrompt: msg({
        id: "itemClasses.commandClasses.list.selectPrompt",
        message: "Select a command class to start editing",
      }),
    },
    newDialogTitle: msg({
      id: "itemClasses.commandClasses.newDialog.title",
      message: "New Command Class",
    }),
    newDialogDescription: msg({
      id: "itemClasses.commandClasses.newDialog.description",
      message: "Create a new command class by providing an ID and a name",
    }),
    duplicateId: msg({
      id: "itemClasses.commandClasses.duplicateId",
      message: "A command class with the ID {codexId} already exists.",
    }),
    undoAdd: msg({
      id: "itemClasses.commandClasses.undo.add",
      message: "Add Command Class",
    }),
    undoEdit: msg({
      id: "itemClasses.commandClasses.undo.edit",
      message: "Edit Command Class",
    }),
    undoDelete: msg({
      id: "itemClasses.commandClasses.undo.delete",
      message: "Delete Command Class",
    }),
  },
};

/**
 * Messages when a deletion is refused because items still refer to the class.
 *
 * The referring items are listed at the end, to simplify sentence inflection.
 */
export const CLASS_IN_USE_MESSAGES: Record<
  ReferenceableClassKind,
  MessageDescriptor
> = {
  parameterClasses: msg({
    id: "itemClasses.parameterClasses.inUse",
    message:
      "Parameter class {codexId} is in use. Remove it from these parameters first: {referrers}",
  }),
  resourceClasses: msg({
    id: "itemClasses.resourceClasses.inUse",
    message:
      "Resource class {codexId} is in use. Remove it from these resources first: {referrers}",
  }),
  commandClasses: msg({
    id: "itemClasses.commandClasses.inUse",
    message:
      "Command class {codexId} is in use. Remove it from these commands first: {referrers}",
  }),
};

/**
 * What the undo menu calls changes to the arguments and return values of a
 * command class.
 */
export const COMMAND_MEMBER_UNDO: Record<
  CommandMemberKind,
  { add: MessageDescriptor; edit: MessageDescriptor; delete: MessageDescriptor }
> = {
  commandClassArguments: {
    add: msg({
      id: "itemClasses.commandClassArguments.undo.add",
      message: "Add Command Class Argument",
    }),
    edit: msg({
      id: "itemClasses.commandClassArguments.undo.edit",
      message: "Edit Command Class Argument",
    }),
    delete: msg({
      id: "itemClasses.commandClassArguments.undo.delete",
      message: "Delete Command Class Argument",
    }),
  },
  commandClassReturnValues: {
    add: msg({
      id: "itemClasses.commandClassReturnValues.undo.add",
      message: "Add Command Class Return Value",
    }),
    edit: msg({
      id: "itemClasses.commandClassReturnValues.undo.edit",
      message: "Edit Command Class Return Value",
    }),
    delete: msg({
      id: "itemClasses.commandClassReturnValues.undo.delete",
      message: "Delete Command Class Return Value",
    }),
  },
};

/** What the undo menu calls changes to a class's enum choices. */
export const ENUM_CHOICE_UNDO = {
  add: msg({
    id: "itemClasses.enumChoices.undo.add",
    message: "Add Enum Choice",
  }),
  edit: msg({
    id: "itemClasses.enumChoices.undo.edit",
    message: "Edit Enum Choice",
  }),
  delete: msg({
    id: "itemClasses.enumChoices.undo.delete",
    message: "Delete Enum Choice",
  }),
};
