import { useEffect, useId } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { ExclamationTriangleIcon } from "@heroicons/react/16/solid";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { AppInput } from "components/AppInput";
import { RenderError } from "components/RenderError";
import { ItemClassDisplay } from "components/ItemClassDisplay";
import { CommandClassDisplay } from "./CommandClassDisplay";
import { EnumChoicesEditor } from "components/EnumChoicesEditor";
import { ValidatedInput } from "components/ValidatedInput";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { Item, ItemGroup } from "components/scn-ui/Item";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import { unitToString } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import { useCurrentLocale } from "app/store";
import { CodexId, EntityId, EnumChoiceParent } from "app/persistentState";
import {
  modifyCommand,
  modifyCommandLocalizedValue,
  useCommandCodexIds,
  useCommandInfo,
} from "./state";

interface Props {
  id: EntityId;
}

export const CommandEditor = ({ id }: Props) => {
  const commandCodexIds = useCommandCodexIds();
  const commandInfo = useCommandInfo(id);
  const locale = useCurrentLocale();

  const idPrefix = useId();

  const commandHasReturnValues =
    commandInfo?.commandClass?.returnValues &&
    Object.values(commandInfo.commandClass.returnValues).length > 0;

  // Completion Notification must be true if the command class has a return value
  useEffect(() => {
    if (commandInfo?.command && commandHasReturnValues) {
      modifyCommand(id, (command) => (command.completionNotification = true));
    }
  }, [commandInfo?.commandClass, commandHasReturnValues, id]);

  if (!commandInfo) {
    return <RenderError />;
  }

  const { command, commandClass, instanceArgEnumChoices } = commandInfo;

  if (!commandClass) {
    return (
      <Alert>
        <ExclamationTriangleIcon />
        <AlertTitle>
          <span>
            Class <code>{command.class.codexId}</code> not found.
          </span>
        </AlertTitle>
        <AlertDescription>
          This may be an indication of invalid UDR.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-library`}>Library</Label>
          <AppInput
            id={`${idPrefix}-library`}
            disabled
            value={
              command.class.type === "imported"
                ? command.class.library
                : "Device Library"
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-class`}>Class</Label>
          <ItemClassDisplay
            id={`${idPrefix}-class`}
            value={command.class.codexId}
            tooltipRenderer={() => (
              <CommandClassDisplay commandClass={commandClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={command.codexId}
            onConfirm={(newValue) =>
              modifyCommand(id, (draft) => (draft.codexId = CodexId(newValue)))
            }
            validator={(input) =>
              validateNewItemId(
                input,
                commandCodexIds.filter((value) => value !== command.codexId),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-friendlyName`}>Display Name</Label>
          <ValidatedInput
            id={`${idPrefix}-friendlyName`}
            value={command.friendlyName?.value || ""}
            onConfirm={(newValue) =>
              modifyCommandLocalizedValue(id, "friendlyName", newValue, locale)
            }
          />
        </FieldSet>
        <LabeledCheckbox
          checked={command.completionNotification}
          disabled={commandHasReturnValues}
          onChange={(checked) =>
            modifyCommand(
              id,
              (draft) => (draft.completionNotification = checked),
            )
          }
        >
          Supports Completion Notification
        </LabeledCheckbox>
      </div>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-arguments`}>Arguments</Label>
        <ItemGroup id={`${idPrefix}-arguments`}>
          {commandClass.arguments &&
            Object.entries(commandClass.arguments).map(
              ([argId, argument], index) => {
                const argCodexId = CodexId(argId);
                const parent: EnumChoiceParent =
                  command.class.type === "imported"
                    ? {
                        type: "cmdArg",
                        id: argCodexId,
                        idType: "imported",
                        cmdId: id,
                      }
                    : {
                        type: "cmdArg",
                        id: command.class.id,
                        idType: "local",
                        cmdId: id,
                      };

                return (
                  <div key={index} className="flex flex-col gap-1">
                    <div className="text-sm ml-2">{argId}</div>
                    <Item variant="outline" className="items-start">
                      <FieldSet>
                        <Label>Name</Label>
                        <div className="text-sm flex gap-1">
                          {argument.name.value}
                          {argument.descripton && (
                            <Tooltip>
                              <TooltipTrigger>
                                <QuestionMarkCircleIcon className="size-5 opacity-50" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {argument.descripton.value}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </FieldSet>
                      <FieldSet>
                        <Label id={`${idPrefix}-arg-${argId}-dataType`}>
                          Data Type
                        </Label>
                        <div
                          aria-labelledby={`${idPrefix}-arg-${argId}-dataType`}
                          className="text-sm"
                        >
                          {argument.dataType}
                        </div>
                      </FieldSet>
                      <FieldSet>
                        <Label id={`${idPrefix}-arg-${argId}-required`}>
                          Required
                        </Label>
                        <div
                          aria-labelledby={`${idPrefix}-arg-${argId}-required`}
                        >
                          {argument.required ? "Yes" : "No"}
                        </div>
                      </FieldSet>
                      {argument.unit && (
                        <FieldSet>
                          <Label id={`${idPrefix}-arg-${argId}-unit`}>
                            Unit
                          </Label>
                          <div
                            aria-labelledby={`${idPrefix}-arg-${argId}-unit`}
                            className="text-sm"
                          >
                            {unitToString(argument.unit)}
                          </div>
                        </FieldSet>
                      )}
                      {argument.choices && argument.choices.length > 0 && (
                        <FieldSet>
                          <Label htmlFor={`${idPrefix}-arg-${argId}-choices`}>
                            Enum Choices
                          </Label>
                          <EnumChoicesEditor
                            id={`${idPrefix}-arg-${argId}-choices`}
                            forName={argument.name.value}
                            parent={parent}
                            classChoices={argument.choices}
                            instanceChoices={instanceArgEnumChoices[argCodexId]}
                            exclusions={command.argEnumExclusions?.[argCodexId]}
                            onExclusionChanged={(choiceId, excluded) =>
                              modifyCommand(id, (draft) => {
                                draft.argEnumExclusions ||= {};
                                draft.argEnumExclusions[argCodexId] ||= [];

                                const excludedList =
                                  draft.argEnumExclusions[argCodexId];

                                if (excluded) {
                                  if (
                                    !excludedList.includes(CodexId(choiceId))
                                  ) {
                                    excludedList.push(CodexId(choiceId));
                                  }
                                } else {
                                  draft.argEnumExclusions[argCodexId] =
                                    excludedList.filter(
                                      (value) => value !== choiceId,
                                    );
                                }
                              })
                            }
                          />
                        </FieldSet>
                      )}
                    </Item>
                  </div>
                );
              },
            )}
        </ItemGroup>
      </FieldSet>
    </div>
  );
};
