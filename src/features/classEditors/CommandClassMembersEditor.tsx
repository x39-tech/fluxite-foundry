// The arguments or return values a command class declares.

import { useId } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import {
  CodexId,
  EntityId,
  fcDataTypes,
  FCDataType,
} from "app/persistentState";
import { useAuthoringLocale } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import { Button } from "components/scn-ui/Button";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { Item, ItemGroup } from "components/scn-ui/Item";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { ValidatedInput } from "components/ValidatedInput";
import { SelectField } from "components/EditorFields/SelectField";
import { UnitField } from "components/EditorFields/UnitField";
import { ClassEnumChoicesEditor } from "./ClassEnumChoicesEditor";
import {
  CommandMemberKind,
  LocalizedCommandMember,
  useClassOperations,
  useCommandClassMembers,
} from "./state";

// Display/lookup metadata for each type of command class member.
const MEMBERS = {
  commandClassArguments: {
    add: msg({
      id: "commandClassEditor.arguments.add",
      message: "Add Argument",
    }),
    delete: msg({
      id: "commandClassEditor.arguments.delete",
      message: "Delete Argument {codexId}",
    }),
    // TODO: suitable default in the authoring locale?
    // eslint-disable-next-line lingui/no-unlocalized-strings
    defaultName: "New Argument",
    defaultId: "new-argument",
    choiceParent: "cmdClassArg",
  },
  commandClassReturnValues: {
    add: msg({
      id: "commandClassEditor.returnValues.add",
      message: "Add Return Value",
    }),
    delete: msg({
      id: "commandClassEditor.returnValues.delete",
      message: "Delete Return Value {codexId}",
    }),
    // TODO: suitable default in the authoring locale?
    // eslint-disable-next-line lingui/no-unlocalized-strings
    defaultName: "New Return Value",
    defaultId: "new-return-value",
    choiceParent: "cmdClassRet",
  },
} as const satisfies Record<
  CommandMemberKind,
  {
    add: MessageDescriptor;
    delete: MessageDescriptor;
    defaultName: string;
    defaultId: string;
    choiceParent: string;
  }
>;

interface Props {
  id?: string;
  memberKind: CommandMemberKind;
  classId: EntityId;
}

export const CommandClassMembersEditor = ({
  id,
  memberKind,
  classId,
}: Props) => {
  const members = useCommandClassMembers(memberKind, classId);
  const operations = useClassOperations();
  const locale = useAuthoringLocale();

  const { add, defaultName, defaultId } = MEMBERS[memberKind];
  const takenIds = members.map((member) => member.codexId);
  const { _ } = useLingui();

  return (
    <div id={id} className="flex flex-col gap-2 items-start">
      <ItemGroup className="gap-2 self-stretch">
        {members.map((member) => (
          <CommandClassMemberEditor
            key={member.id}
            memberKind={memberKind}
            member={member}
            takenIds={takenIds}
          />
        ))}
      </ItemGroup>
      <Button
        variant="outline"
        onClick={() =>
          operations.addCommandClassMember(
            memberKind,
            classId,
            CodexId(getUniqueItemId(takenIds, defaultId)),
            defaultName,
            locale,
          )
        }
      >
        <PlusIcon className="size-4" />
        {_(add)}
      </Button>
    </div>
  );
};

interface MemberProps {
  memberKind: CommandMemberKind;
  member: LocalizedCommandMember;
  takenIds: CodexId[];
}

const CommandClassMemberEditor = ({
  memberKind,
  member,
  takenIds,
}: MemberProps) => {
  const operations = useClassOperations();
  const locale = useAuthoringLocale();
  const idPrefix = useId();

  const { delete: deleteLabel, choiceParent } = MEMBERS[memberKind];
  const { _ } = useLingui();

  return (
    <Item variant="outline" className="flex-col items-stretch">
      <div className="flex flex-wrap items-end gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>
            <Trans id="commandClassEditor.field.id">ID</Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={member.codexId}
            onConfirm={(newValue) =>
              operations.modifyCommandClassMember(
                memberKind,
                member.id,
                (draft) => {
                  draft.codexId = CodexId(newValue);
                },
              )
            }
            validator={(input) =>
              validateNewItemId(
                input,
                takenIds.filter((taken) => taken !== member.codexId),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-name`}>
            <Trans id="commandClassEditor.field.name">Name</Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-name`}
            value={member.name.value}
            onConfirm={(newValue) =>
              operations.setCommandClassMemberLocalizedValue(
                memberKind,
                member.id,
                "name",
                newValue,
                locale,
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-description`}>
            <Trans id="commandClassEditor.field.description">Description</Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-description`}
            value={member.description?.value ?? ""}
            onConfirm={(newValue) =>
              operations.setCommandClassMemberLocalizedValue(
                memberKind,
                member.id,
                "description",
                newValue,
                locale,
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-dataType`}>
            <Trans id="commandClassEditor.field.dataType">Data Type</Trans>
          </Label>
          <SelectField
            id={`${idPrefix}-dataType`}
            values={Object.values(fcDataTypes)}
            selectedValue={member.dataType}
            onSelectionChanged={(newValue) =>
              operations.modifyCommandClassMember(
                memberKind,
                member.id,
                (draft) => {
                  draft.dataType = newValue as FCDataType;
                },
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-unit`}>
            <Trans id="commandClassEditor.field.unit">Unit</Trans>
          </Label>
          <UnitField
            id={`${idPrefix}-unit`}
            value={member.unit}
            onValueChanged={(unit) =>
              operations.modifyCommandClassMember(
                memberKind,
                member.id,
                (draft) => {
                  if (unit) {
                    draft.unit = unit;
                  } else {
                    delete draft.unit;
                  }
                },
              )
            }
          />
        </FieldSet>
        <LabeledCheckbox
          className="h-9"
          checked={member.required}
          onChange={(checked) =>
            operations.modifyCommandClassMember(
              memberKind,
              member.id,
              (draft) => {
                draft.required = checked;
              },
            )
          }
        >
          <Trans id="commandClassEditor.field.required">Required</Trans>
        </LabeledCheckbox>
      </div>
      {member.dataType === fcDataTypes.ENUM && (
        <FieldSet>
          <Label htmlFor={`${idPrefix}-enumChoices`}>
            <Trans id="commandClassEditor.field.enumChoices">
              Enum Choices
            </Trans>
          </Label>
          <ClassEnumChoicesEditor
            id={`${idPrefix}-enumChoices`}
            parentType={choiceParent}
            parentId={member.id}
          />
        </FieldSet>
      )}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          aria-label={_({
            ...deleteLabel,
            values: { codexId: member.codexId },
          })}
          onClick={() =>
            operations.deleteCommandClassMember(memberKind, member.id)
          }
        >
          <Trash2Icon className="size-4 stroke-red-500" />
        </Button>
      </div>
    </Item>
  );
};
