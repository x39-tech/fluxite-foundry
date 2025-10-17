import { useEffect, useId } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
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
import { getLocalizedCommand } from "udr/udrDatabase";
import { unitToString } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import {
  changeCommandId,
  EnumChoiceLocation,
  modifyCommand,
  modifyCommandEnumChoice,
  modifyCommandFriendlyName,
  removeCommandEnumChoice,
  useCommand,
  useCommandClass,
  useCommandIds,
} from "./state";
import { useDeviceLocalizations } from "../state";

interface Props {
  id: string;
}

export const CommandEditor = ({ id }: Props) => {
  const commandIds = useCommandIds();
  const unlocalizedCommand = useCommand(id);
  const commandClass = useCommandClass(unlocalizedCommand);
  const localizations = useDeviceLocalizations();

  const idPrefix = useId();

  const commandHasReturnValues =
    commandClass?.returns && Object.values(commandClass?.returns).length > 0;

  // Completion Notification must be true if the command class has a return value
  useEffect(() => {
    if (unlocalizedCommand && commandHasReturnValues) {
      modifyCommand(id, (command) => (command.completionNotification = true));
    }
  }, [commandClass]);

  if (!unlocalizedCommand || !commandClass) {
    // TODO: better user feedback here
    return <RenderError />;
  }

  const command = getLocalizedCommand(unlocalizedCommand, localizations);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-library`}>Library</Label>
          <AppInput
            id={`${idPrefix}-library`}
            disabled
            value={command.library || "Device Library"}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-class`}>Class</Label>
          <ItemClassDisplay
            id={`${idPrefix}-class`}
            value={command.class}
            tooltipRenderer={() => (
              <CommandClassDisplay commandClass={commandClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={id}
            onConfirm={(newValue) => changeCommandId(id, newValue)}
            validator={(input) =>
              validateNewItemId(
                input,
                commandIds.filter((value) => value !== id),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-friendlyName`}>Display Name</Label>
          <ValidatedInput
            id={`${idPrefix}-friendlyName`}
            value={command.friendlyName || ""}
            onConfirm={(newValue) => modifyCommandFriendlyName(id, newValue)}
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
              ([argId, argument], index) => (
                <div key={index} className="flex flex-col gap-1">
                  <div className="text-sm ml-2">{argId}</div>
                  <Item variant="outline" className="items-start">
                    <FieldSet>
                      <Label>Name</Label>
                      <div className="text-sm flex gap-1">
                        {argument.name}
                        {argument.description && (
                          <Tooltip>
                            <TooltipTrigger>
                              <QuestionMarkCircleIcon className="size-5 opacity-50" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {argument.description}
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
                        <Label id={`${idPrefix}-arg-${argId}-unit`}>Unit</Label>
                        <div
                          aria-labelledby={`${idPrefix}-arg-${argId}-unit`}
                          className="text-sm"
                        >
                          {unitToString(argument.unit)}
                        </div>
                      </FieldSet>
                    )}
                    {argument.choices && (
                      <FieldSet>
                        <Label htmlFor={`${idPrefix}-arg-${argId}-choices`}>
                          Enum Choices
                        </Label>
                        <EnumChoicesEditor
                          id={`${idPrefix}-arg-${argId}-choices`}
                          forName={argument.name}
                          classChoices={argument.choices}
                          instanceChoices={command.argumentChoices?.[argId]}
                          onExclusionChanged={(choiceId, excluded) =>
                            modifyCommand(id, (draft) => {
                              draft.argumentChoices ||= {};
                              draft.argumentChoices[argId] ||= { excluded: [] };
                              draft.argumentChoices[argId].excluded ||= [];

                              const excludedList =
                                draft.argumentChoices[argId].excluded;

                              if (excluded) {
                                if (!excludedList.includes(choiceId)) {
                                  excludedList.push(choiceId);
                                }
                              } else {
                                draft.argumentChoices[argId].excluded =
                                  excludedList.filter(
                                    (value) => value !== choiceId,
                                  );
                              }
                            })
                          }
                          onInstanceChoiceRemoved={(choiceIndex) =>
                            removeCommandEnumChoice(
                              id,
                              argId,
                              choiceIndex,
                              EnumChoiceLocation.Argument,
                            )
                          }
                          onInstanceChoiceUpdated={(
                            choiceIndex,
                            updatedChoice,
                          ) =>
                            modifyCommandEnumChoice(
                              id,
                              argId,
                              choiceIndex,
                              updatedChoice,
                              EnumChoiceLocation.Argument,
                            )
                          }
                        />
                      </FieldSet>
                    )}
                  </Item>
                </div>
              ),
            )}
        </ItemGroup>
      </FieldSet>
    </div>
  );
};
