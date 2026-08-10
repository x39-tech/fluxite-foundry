import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckIcon, XIcon } from "lucide-react";
import {
  DriverParamState,
  DriverParamValue,
  ParamReference,
} from "@cpwg-community/delver";
import {
  fcDataTypes,
  FCUnit,
  fcUnitNames,
  ParameterCount,
} from "app/persistentState";
import {
  MappableParameter,
  useDmxController,
  useMappableParameters,
} from "../dmxEditor/state";
import { Button } from "components/scn-ui/Button";
import { Slider } from "components/scn-ui/Slider";
import { TextEditorField } from "components/EditorFields/DeprecatedTextEditorField";
import { useDarkMode } from "app/store";
import { DmxDisplay } from "./DmxDisplay";
import { useDmxSequenceManager } from "./sequenceManager/useDmxSequenceManager";
import { ActiveSequencesButton } from "./ActiveSequencesButton";

const MESSAGES = {
  connectionClosed: msg({
    id: "deviceClassEditor.dmxController.connectionClosed",
    message: "DMX server connection closed",
  }),
  connectionFailed: msg({
    id: "deviceClassEditor.dmxController.connectionFailed",
    message: "DMX server connection failed",
  }),
  connect: msg({
    id: "deviceClassEditor.dmxController.connect",
    message: "Connect",
  }),
  disconnect: msg({
    id: "deviceClassEditor.dmxController.disconnect",
    message: "Disconnect",
  }),
};

interface ServerConnection {
  active: boolean;
  addressAndPort: string;
}

interface WebSocketPayload {
  universe: number;
  offset: number;
  slots: number[];
}

interface DmxControllerState {
  paramStates: Map<string, DriverParamState>;
  dmxValues: Uint8Array;
}

export const DmxController = () => {
  const { _ } = useLingui();

  const mappableParams = useMappableParameters();
  const dmxController = useDmxController();
  const [controllerState, setControllerState] = useState<DmxControllerState>({
    paramStates: new Map(),
    dmxValues: new Uint8Array(),
  });
  const [serverConnection, setServerConnection] = useState<ServerConnection>({
    active: false,
    addressAndPort: "",
  });
  const websocketConnRef = useRef<WebSocket | null>(null);
  const darkMode = useDarkMode();
  const sequenceManager = useDmxSequenceManager();

  // Initialize param states when the DMX driver changes
  useEffect(() => {
    if (dmxController.state === "available") {
      const paramStates = dmxController.driver.getParamStates();
      const stateMap = new Map<string, DriverParamState>();
      for (const state of paramStates) {
        stateMap.set(serializeParamRef(state.param), state);
      }
      const dmxValues = dmxController.driver.getDmxValues();
      setControllerState({
        paramStates: stateMap,
        dmxValues,
      });
      sequenceManager.actions.setBaseDmxValues(dmxValues);
    }
  }, [dmxController, sequenceManager.actions]);

  // Use sequence-aware DMX values (base values with sequence overrides)
  const finalDmxValues = sequenceManager.dmxValues;

  // Send websocket data when DMX values change
  useEffect(() => {
    if (serverConnection.active && websocketConnRef.current) {
      websocketConnRef.current.send(
        JSON.stringify({
          universe: 1,
          offset: 0,
          slots: Array.from(finalDmxValues),
        } as WebSocketPayload),
      );
    }
  }, [serverConnection.active, finalDmxValues]);

  const handleParamChange = useCallback(
    (paramId: string, paramIndex: number | undefined, newValue: number) => {
      if (dmxController.state !== "available") return;

      const driverValue: DriverParamValue = {
        type: "numeric",
        value: newValue,
      };
      const result = dmxController.driver.updateParamValue(
        paramId,
        paramIndex ?? null,
        driverValue,
      );

      setControllerState((prev) => {
        const newParamStates = new Map(prev.paramStates);
        for (const update of result.paramStateUpdates) {
          newParamStates.set(serializeParamRef(update.param), update);
        }
        return {
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

  const serverAreaBg = darkMode ? "bg-gray-800" : "bg-gray-200";

  switch (dmxController.state) {
    case "available":
      break;
    case "not-created":
      return (
        <p>
          <Trans id="deviceClassEditor.dmxController.noMapping">
            Add a DMX parameter mapping in the DMX editor to use the test
            controller.
          </Trans>
        </p>
      );
    case "error": {
      const reason = dmxController.error.message;
      return (
        <p>
          <Trans id="deviceClassEditor.dmxController.compileError">
            Error compiling DMX test controller: {reason}
          </Trans>
        </p>
      );
    }
  }

  // Get parameters sorted by codexId for display
  const sortedMappableParams = Object.values(mappableParams).sort((a, b) =>
    a.param.codexId.localeCompare(b.param.codexId),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-row items-start justify-center gap-4">
        <DmxDisplay
          dmxValues={finalDmxValues}
          activeSlots={sequenceManager.state.activeSlots}
        />
        <div className="mt-2">
          <ActiveSequencesButton
            chunkStates={sequenceManager.state.chunkStates}
            hasActiveSequences={sequenceManager.state.hasActiveSequences}
          />
        </div>
      </div>
      <div
        className={`${serverAreaBg} flex flex-wrap justify-center items-center gap-2 p-1`}
      >
        <span className="font-bold">
          <Trans id="deviceClassEditor.dmxController.server">Server</Trans>
        </span>
        <span>
          <Trans id="deviceClassEditor.dmxController.addressAndPort">
            Address and Port:
          </Trans>
        </span>
        <TextEditorField
          value={serverConnection.addressAndPort}
          onValueChanged={(value) =>
            setServerConnection({ ...serverConnection, addressAndPort: value })
          }
        />
        <span className="flex items-center">
          {serverConnection.active ? (
            <>
              <span className="mr-2">
                <Trans id="deviceClassEditor.dmxController.statusConnected">
                  Status: Connected
                </Trans>
              </span>
              <CheckIcon className="size-5" />
            </>
          ) : (
            <>
              <span className="mr-2">
                <Trans id="deviceClassEditor.dmxController.statusDisconnected">
                  Status: Disconnected
                </Trans>
              </span>
              <XIcon className="size-5" />
            </>
          )}
        </span>
        <Button
          size="sm"
          onClick={() => {
            const ws = new WebSocket(`ws://${serverConnection.addressAndPort}`);
            ws.onopen = () => {
              setServerConnection({ ...serverConnection, active: true });
            };
            ws.onclose = () => {
              toast(_(MESSAGES.connectionClosed));
              setServerConnection({ ...serverConnection, active: false });
            };
            ws.onerror = () => {
              toast(_(MESSAGES.connectionFailed));
              setServerConnection({ ...serverConnection, active: false });
            };
            websocketConnRef.current = ws;
          }}
        >
          {_(serverConnection.active ? MESSAGES.disconnect : MESSAGES.connect)}
        </Button>
      </div>
      <div className="overflow-auto">
        {sortedMappableParams.map((mappable) => (
          <ParameterControl
            key={mappable.param.codexId}
            mappable={mappable}
            controllerState={controllerState}
            onParamChange={handleParamChange}
          />
        ))}
      </div>
    </div>
  );
};

interface ParameterControlProps {
  mappable: MappableParameter;
  controllerState: DmxControllerState;
  onParamChange: (
    paramId: string,
    paramIndex: number | undefined,
    newValue: number,
  ) => void;
}

const ParameterControl = ({
  mappable,
  controllerState,
  onParamChange,
}: ParameterControlProps) => {
  const { param, paramClass } = mappable;

  if (paramClass.dataType !== fcDataTypes.NUMBER) {
    // TODO: Support boolean and enum parameters
    return null;
  }

  if (typeof param.minimum !== "number" || typeof param.maximum !== "number") {
    return null;
  }

  const min = param.minimum;
  const max = param.maximum;
  const paramId = param.codexId;

  // Handle multi-count parameters
  const count = getParameterCount(param.count);
  const controls = [];

  for (let index = 0; index < count; index++) {
    const paramRef: ParamReference =
      count > 1 ? { id: paramId, index } : { id: paramId };
    const paramKey = serializeParamRef(paramRef);
    const paramState = controllerState.paramStates.get(paramKey);
    const currentValue = getNumericValue(paramState?.value) ?? min;
    const isActive = paramState?.value.type !== "null";

    controls.push(
      <div key={paramKey} className="flex items-center py-2">
        <span className="mx-4">
          {paramKey}
          {getUnitString(paramClass.unit)}
        </span>
        <div className="grow" />
        <Slider
          className={`max-w-96 mx-4 ${!isActive ? "opacity-50" : ""}`}
          min={min}
          max={max}
          value={[currentValue]}
          onValueChange={(values) => {
            onParamChange(paramId, count > 1 ? index : undefined, values[0]);
          }}
          step={getSliderStepSize(min, max)}
        />
      </div>,
    );
  }

  return <div className="flex flex-col border-b py-2">{controls}</div>;
};

const SI_PREFIXES: { [key: number]: string } = {
  // I hate javascript
  "-24": "yocto",
  "-21": "zepto",
  "-18": "atto",
  "-15": "femto",
  "-12": "pico",
  "-9": "nano",
  "-6": "micro",
  "-3": "milli",
  "0": "",
  "3": "kilo",
  "6": "mega",
  "9": "giga",
  "12": "tera",
  "15": "peta",
  "18": "exa",
  "21": "zetta",
  "24": "yotta",
};

function getUnitString(unit: FCUnit | undefined): string {
  if (!unit) {
    return "";
  }

  if (unit.name == fcUnitNames.NONE) {
    return "";
  } else if (
    unit.name == fcUnitNames.OTHER ||
    unit.name == fcUnitNames.RATIO ||
    !unit.exponent
  ) {
    return ` (${unit.name})`;
  } else if (unit.exponent in SI_PREFIXES) {
    return ` (${SI_PREFIXES[unit.exponent]}${unit.name})`;
  } else {
    return ` (${unit.name} * 10^${unit.exponent})`;
  }
}

function getSliderStepSize(min: number, max: number): number {
  // Default 1, but ensure at least 50 steps
  let stepSize = 1;
  if (min >= max) {
    return stepSize;
  }
  while ((max - min) / stepSize < 50) {
    stepSize /= 10;
  }
  return stepSize;
}

function serializeParamRef(ref: ParamReference): string {
  if (ref.index !== undefined) {
    return `${ref.id}[${ref.index}]`;
  }
  return ref.id;
}

function getParameterCount(count: ParameterCount | undefined): number {
  if (!count) {
    return 1;
  }
  if (count.type === "fixed") {
    return count.value;
  }
  // For dynamic count, use minimum as the initial count
  return count.min;
}

function getNumericValue(value: DriverParamValue | undefined): number | null {
  if (!value || value.type === "null") {
    return null;
  }
  if (value.type === "numeric") {
    return value.value;
  }
  if (value.type === "bool") {
    return value.value ? 1 : 0;
  }
  if (value.type === "enum") {
    return value.value;
  }
  return null;
}
