import { useId } from "react";
import { EntityId } from "app/persistentState";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { classKinds } from "./context";
import { ClassIdentityFields } from "./ClassIdentityFields";
import { CommandClassMembersEditor } from "./CommandClassMembersEditor";
import { commandMemberKinds, useCommandClassInfo } from "./state";

interface Props {
  id: EntityId;
}

export const CommandClassEditor = ({ id }: Props) => {
  const commandClass = useCommandClassInfo(id);
  const idPrefix = useId();

  if (!commandClass) {
    return <RenderError />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <ClassIdentityFields
          idPrefix={idPrefix}
          kind={classKinds.COMMAND}
          id={id}
          codexId={commandClass.codexId}
          name={commandClass.name.value}
          description={commandClass.description?.value}
        />
      </div>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-arguments`}>Arguments</Label>
        <CommandClassMembersEditor
          id={`${idPrefix}-arguments`}
          memberKind={commandMemberKinds.ARGUMENT}
          classId={id}
        />
      </FieldSet>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-returnValues`}>Return Values</Label>
        <CommandClassMembersEditor
          id={`${idPrefix}-returnValues`}
          memberKind={commandMemberKinds.RETURN_VALUE}
          classId={id}
        />
      </FieldSet>
    </div>
  );
};
