// The arguments or return values a command class declares.

import { useId } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  CodexId,
  EntityId,
  fcDataTypes,
  FCDataType,
} from "app/persistentState";
import { useCurrentLocale } from "app/store";
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
    singular: "Argument",
    defaultId: "new-argument",
    choiceParent: "cmdClassArg",
  },
  commandClassReturnValues: {
    singular: "Return Value",
    defaultId: "new-return-value",
    choiceParent: "cmdClassRet",
  },
} as const;

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
  const locale = useCurrentLocale();

  const { singular, defaultId } = MEMBERS[memberKind];
  const takenIds = members.map((member) => member.codexId);

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
            `New ${singular}`,
            locale,
          )
        }
      >
        <PlusIcon className="size-4" />
        Add {singular}
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
  const locale = useCurrentLocale();
  const idPrefix = useId();

  const { singular, choiceParent } = MEMBERS[memberKind];

  return (
    <Item variant="outline" className="flex-col items-stretch">
      <div className="flex flex-wrap items-end gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
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
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
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
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
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
          <Label htmlFor={`${idPrefix}-dataType`}>Data Type</Label>
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
          <Label htmlFor={`${idPrefix}-unit`}>Unit</Label>
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
          Required
        </LabeledCheckbox>
      </div>
      {member.dataType === fcDataTypes.ENUM && (
        <FieldSet>
          <Label htmlFor={`${idPrefix}-enumChoices`}>Enum Choices</Label>
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
          aria-label={`Delete ${singular} ${member.codexId}`}
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
