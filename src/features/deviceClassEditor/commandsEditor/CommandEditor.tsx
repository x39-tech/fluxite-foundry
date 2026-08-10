import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useEffect, useId } from "react";
import { CircleQuestionMarkIcon, TriangleAlertIcon } from "lucide-react";
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
import { useAuthoringLocale } from "app/store";
import {
  LocalOrImportedId,
  CodexId,
  EntityId,
  EnumChoiceParent,
} from "app/persistentState";
import {
  modifyCommand,
  modifyCommandLocalizedValue,
  useCommandCodexIds,
  useCommandInfo,
} from "./state";

const DEVICE_LIBRARY = msg({
  id: "deviceClassEditor.commandEditor.deviceLibrary",
  message: "Device Library",
});

interface Props {
  id: EntityId;
}

export const CommandEditor = ({ id }: Props) => {
  const { _ } = useLingui();

  const commandCodexIds = useCommandCodexIds();
  const commandInfo = useCommandInfo(id);
  const locale = useAuthoringLocale();

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
    const codexId =
      command.class.type === "imported" ? command.class.codexId : undefined;

    return (
      <Alert>
        <TriangleAlertIcon />
        <AlertTitle>
          <span>
            {codexId !== undefined ? (
              <Trans id="deviceClassEditor.commandEditor.importedClassNotFound">
                Class <code>{codexId}</code> not found.
              </Trans>
            ) : (
              <Trans id="deviceClassEditor.commandEditor.referencedClassNotFound">
                Referenced class not found. It may have been deleted.
              </Trans>
            )}
          </span>
        </AlertTitle>
        <AlertDescription>
          <Trans id="deviceClassEditor.commandEditor.referencedClassNotFoundDesc">
            This may be an indication of invalid Fluxite Codex.
          </Trans>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-library`}>
            <Trans id="deviceClassEditor.commandEditor.library">Library</Trans>
          </Label>
          <AppInput
            id={`${idPrefix}-library`}
            disabled
            value={
              command.class.type === "imported"
                ? command.class.library
                : _(DEVICE_LIBRARY)
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-class`}>
            <Trans id="deviceClassEditor.commandEditor.class">Class</Trans>
          </Label>
          <ItemClassDisplay
            id={`${idPrefix}-class`}
            value={commandClass.codexId}
            tooltipRenderer={() => (
              <CommandClassDisplay commandClass={commandClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>
            <Trans id="deviceClassEditor.commandEditor.id">ID</Trans>
          </Label>
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
          <Label htmlFor={`${idPrefix}-friendlyName`}>
            <Trans id="deviceClassEditor.commandEditor.displayName">
              Display Name
            </Trans>
          </Label>
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
          <Trans id="deviceClassEditor.commandEditor.supportsCompletionNotification">
            Supports Completion Notification
          </Trans>
        </LabeledCheckbox>
      </div>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-arguments`}>
          <Trans id="deviceClassEditor.commandEditor.arguments">
            Arguments
          </Trans>
        </Label>
        <ItemGroup id={`${idPrefix}-arguments`}>
          {commandClass.arguments &&
            Object.entries(commandClass.arguments).map(
              ([argId, argument], index) => {
                const argCodexId = CodexId(argId);
                const argMemberId: LocalOrImportedId = argument.id;
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
                        <Label>
                          <Trans id="deviceClassEditor.commandEditor.name">
                            Name
                          </Trans>
                        </Label>
                        <div className="text-sm flex gap-1">
                          {argument.name.value}
                          {argument.descripton && (
                            <Tooltip>
                              <TooltipTrigger>
                                <CircleQuestionMarkIcon className="size-5 opacity-50" />
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
                          <Trans id="deviceClassEditor.commandEditor.dataType">
                            Data Type
                          </Trans>
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
                          <Trans id="deviceClassEditor.commandEditor.required">
                            Required
                          </Trans>
                        </Label>
                        <div
                          aria-labelledby={`${idPrefix}-arg-${argId}-required`}
                        >
                          {argument.required ? (
                            <Trans id="deviceClassEditor.commandEditor.required.yes">
                              Yes
                            </Trans>
                          ) : (
                            <Trans id="deviceClassEditor.commandEditor.required.no">
                              No
                            </Trans>
                          )}
                        </div>
                      </FieldSet>
                      {argument.unit && (
                        <FieldSet>
                          <Label id={`${idPrefix}-arg-${argId}-unit`}>
                            <Trans id="deviceClassEditor.commandEditor.unit">
                              Unit
                            </Trans>
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
                            <Trans id="deviceClassEditor.commandEditor.enumChoices">
                              Enum Choices
                            </Trans>
                          </Label>
                          <EnumChoicesEditor
                            id={`${idPrefix}-arg-${argId}-choices`}
                            forName={argument.name.value}
                            parent={parent}
                            classChoices={argument.choices}
                            instanceChoices={instanceArgEnumChoices[argCodexId]}
                            exclusions={
                              command.argEnumExclusions?.[argMemberId]
                            }
                            onExclusionChanged={(choiceId, excluded) =>
                              modifyCommand(id, (draft) => {
                                draft.argEnumExclusions ||= {};
                                draft.argEnumExclusions[argMemberId] ||= [];

                                const excludedList =
                                  draft.argEnumExclusions[argMemberId];

                                if (excluded) {
                                  if (!excludedList.includes(choiceId)) {
                                    excludedList.push(choiceId);
                                  }
                                } else {
                                  draft.argEnumExclusions[argMemberId] =
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
