import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useEffect, useState, useCallback, useId } from "react";
import { i18n } from "@lingui/core";
import { isTauri } from "@tauri-apps/api/core";
import { DriverParamValue } from "@cpwg-community/delver";
import { Columns2Icon, Rows2Icon } from "lucide-react";
import { toast } from "sonner";
import { EntityId } from "app/persistentState";
import { FieldSet } from "components/FieldSet";
import { SelectField } from "components/EditorFields/SelectField";
import { Label } from "components/scn-ui/Label";
import { DmxControllerLayout } from "app/runtimeState";
import {
  SidebarLayout,
  SidebarLayoutMain,
  SidebarLayoutSidebar,
} from "components/SidebarLayout";
import { Button } from "components/scn-ui/Button";
import { Separator } from "components/scn-ui/Separator";
import { cn, errorMessage } from "utils/utils";
import {
  useDmxController,
  useDmxModes,
  useMappableParameters,
} from "../dmxEditor/state";
import { resetDmxDriver } from "../effects";
import { useCurrentEditorId } from "../state";
import { ActiveSequencesPane } from "./ActiveSequencesPane";
import { DmxDisplay } from "./DmxDisplay";
import { ParametersPanel } from "./ParametersPanel";
import { ParamStates, paramStatesByRef } from "./parameterValues";
import { SacnOutputControls } from "./sacnOutput/SacnOutputControls";
import { useDmxSequenceManager } from "./sequenceManager/useDmxSequenceManager";
import {
  selectControllerDmxSerializer,
  setDmxControllerLayout,
  useControllerDmxSerializerId,
  useDmxControllerLayout,
} from "./state";

const MESSAGES = {
  setValueFailed: msg({
    id: "deviceClassEditor.dmxController.setValueFailed",
    message: "Could not set {paramId}: {reason}",
  }),
};

interface DmxControllerState {
  paramStates: ParamStates;
  // The states the driver started with - the reset button returns to these
  initialParamStates: ParamStates;
  dmxValues: Uint8Array;
}

export const DmxController = () => {
  const documentId = useCurrentEditorId();
  const mappableParams = useMappableParameters();
  const dmxController = useDmxController();
  const layout = useDmxControllerLayout(documentId);
  const [controllerState, setControllerState] = useState<DmxControllerState>({
    paramStates: new Map(),
    initialParamStates: new Map(),
    dmxValues: new Uint8Array(),
  });
  const sequenceManager = useDmxSequenceManager();

  // Initialize param states when the DMX driver changes
  useEffect(() => {
    if (dmxController.state === "available") {
      const paramStates = paramStatesByRef(
        dmxController.driver.getParamStates(),
      );
      const dmxValues = dmxController.driver.getDmxValues();
      setControllerState({
        paramStates,
        initialParamStates: paramStates,
        dmxValues,
      });
      sequenceManager.actions.setBaseDmxValues(dmxValues);
    }
  }, [dmxController, sequenceManager.actions]);

  // Use sequence-aware DMX values (base values with sequence overrides)
  const finalDmxValues = sequenceManager.dmxValues;

  const handleParamChange = useCallback(
    (
      paramId: string,
      paramIndex: number | undefined,
      newValue: DriverParamValue,
    ) => {
      if (dmxController.state !== "available") return;

      let result;
      try {
        result = dmxController.driver.updateParamValue(
          paramId,
          paramIndex ?? null,
          newValue,
        );
      } catch (error) {
        toast.error(
          i18n._({
            ...MESSAGES.setValueFailed,
            values: { paramId, reason: errorMessage(error) },
          }),
        );
        return;
      }

      setControllerState((prev) => {
        const newParamStates = new Map(prev.paramStates);
        for (const update of paramStatesByRef(result.paramStateUpdates)) {
          newParamStates.set(...update);
        }
        return {
          ...prev,
          paramStates: newParamStates,
          dmxValues: result.dmxValues,
        };
      });

      // Update base DMX values for sequence manager
      sequenceManager.actions.setBaseDmxValues(result.dmxValues);

      // Queue any sequences returned by the driver
      if (result.queuedDmxSequences.length > 0) {
        sequenceManager.actions.queueSequences(result.queuedDmxSequences);
      }
    },
    [dmxController, sequenceManager.actions],
  );

  const available = dmxController.state === "available";
  const horizontal = layout === "horizontal";

  return (
    <SidebarLayout collapseBelow={1000} className="gap-2 bg-muted/50 p-2">
      <SidebarLayoutSidebar className="h-full">
        <div className="flex h-full w-64 flex-col gap-4 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">
            <Trans id="deviceClassEditor.dmxController.title">
              Test DMX Controller
            </Trans>
          </h2>
          <ModeSelect />
          {available && (
            <>
              <ActiveSequencesPane
                className="flex-1"
                chunkStates={sequenceManager.state.chunkStates}
                hasActiveSequences={sequenceManager.state.hasActiveSequences}
              />
              {isTauri() && documentId && (
                <>
                  <Separator />
                  <div className="flex-1 min-h-0 overflow-auto">
                    <SacnOutputControls
                      documentId={documentId}
                      dmxValues={finalDmxValues}
                    />
                  </div>
                </>
              )}
              {documentId && (
                <>
                  <Separator />
                  <LayoutButton documentId={documentId} layout={layout} />
                </>
              )}
            </>
          )}
        </div>
      </SidebarLayoutSidebar>
      {available ? (
        <SidebarLayoutMain
          className={cn("flex gap-2", horizontal ? "flex-row" : "flex-col")}
        >
          <DmxDisplay
            className={horizontal ? "w-fit shrink-0" : "max-h-2/5 shrink-0"}
            dmxValues={finalDmxValues}
            activeSlots={sequenceManager.state.activeSlots}
          />
          <ParametersPanel
            className="min-w-0 flex-1"
            mappableParams={Object.values(mappableParams)}
            paramStates={controllerState.paramStates}
            initialParamStates={controllerState.initialParamStates}
            onParamChange={handleParamChange}
            onResetAll={() => documentId && resetDmxDriver(documentId)}
          />
        </SidebarLayoutMain>
      ) : (
        <SidebarLayoutMain className="flex items-center justify-center rounded-lg border bg-card p-4">
          <p className="text-center text-muted-foreground">
            {dmxController.state === "error" ? (
              <CompileErrorMessage reason={dmxController.error.message} />
            ) : (
              <Trans id="deviceClassEditor.dmxController.noMapping">
                Add a DMX parameter mapping in the DMX Mapping editor to use the
                test controller.
              </Trans>
            )}
          </p>
        </SidebarLayoutMain>
      )}
    </SidebarLayout>
  );
};

const CompileErrorMessage = ({ reason }: { reason: string }) => (
  <Trans id="deviceClassEditor.dmxController.compileError">
    Error compiling DMX test controller: {reason}
  </Trans>
);

// Picks the mode the test controller is built from. Shows nothing when the
// document has no modes.
const ModeSelect = () => {
  const id = useId();
  const documentId = useCurrentEditorId();
  const modes = useDmxModes();
  const selectedId = useControllerDmxSerializerId();

  if (!documentId || !selectedId) {
    return null;
  }

  return (
    <FieldSet>
      <Label htmlFor={id}>
        <Trans id="deviceClassEditor.dmxController.mode">Mode</Trans>
      </Label>
      <SelectField
        id={id}
        className="w-full"
        size="sm"
        values={modes.map((mode) => mode.id)}
        displayValues={modes.map((mode) => mode.codexId)}
        selectedValue={selectedId}
        onSelectionChanged={(serializerId) =>
          selectControllerDmxSerializer(documentId, EntityId(serializerId))
        }
      />
    </FieldSet>
  );
};

interface LayoutButtonProps {
  documentId: EntityId;
  layout: DmxControllerLayout;
}

// Switches between the output beside the parameters and above them. It shows
// the layout in use.
const LayoutButton = ({ documentId, layout }: LayoutButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    className="justify-start text-primary hover:text-primary"
    onClick={() =>
      setDmxControllerLayout(
        documentId,
        layout === "horizontal" ? "vertical" : "horizontal",
      )
    }
  >
    {layout === "horizontal" ? (
      <>
        <Columns2Icon />
        <Trans id="deviceClassEditor.dmxController.splitHorizontal">
          Split Horizontal
        </Trans>
      </>
    ) : (
      <>
        <Rows2Icon />
        <Trans id="deviceClassEditor.dmxController.splitVertical">
          Split Vertical
        </Trans>
      </>
    )}
  </Button>
);
