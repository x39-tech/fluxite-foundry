import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { EntityId } from "app/persistentState";
import { IntegerInput } from "components/IntegerInput";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { Label } from "components/scn-ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { errorMessage } from "utils/utils";
import {
  listNetworkInterfaces,
  MAX_UNIVERSE,
  MIN_UNIVERSE,
  NetworkInterface,
  setSacnLevels,
  UNIVERSE_SIZE,
} from "./native";
import {
  buildUniverseFrame,
  setSacnOutputActive,
  updateSacnOutputSettings,
  useSacnOutputActive,
  useSacnOutputSettings,
} from "./state";

const MESSAGES = {
  listInterfacesFailed: msg({
    id: "deviceClassEditor.sacnOutput.listInterfacesFailed",
    message: "Could not list network interfaces: {reason}",
  }),
  selectInterface: msg({
    id: "deviceClassEditor.sacnOutput.selectInterface",
    message: "Select an interface",
  }),
  noIpv4Address: msg({
    id: "deviceClassEditor.sacnOutput.noIpv4Address",
    message: "No IPv4 address",
  }),
  unavailable: msg({
    id: "deviceClassEditor.sacnOutput.unavailable",
    message: "Unavailable",
  }),
};

interface SacnOutputControlsProps {
  documentId: EntityId;
  // The device's DMX footprint, as it should be transmitted.
  dmxValues: Uint8Array;
}

/**
 * Controls for transmitting the test controller's output as sACN. Only usable
 * on the desktop.
 */
export const SacnOutputControls = ({
  documentId,
  dmxValues,
}: SacnOutputControlsProps) => {
  const { _ } = useLingui();
  const settings = useSacnOutputSettings(documentId);
  const active = useSacnOutputActive(documentId);
  const interfaces = useNetworkInterfaces();
  const interfaceId = useId();

  // Pick an interface for the user the first time there is one to pick.
  useEffect(() => {
    if (settings.interfaceName || !interfaces.list) return;
    const defaultInterface = chooseDefaultInterface(interfaces.list);
    if (defaultInterface) {
      updateSacnOutputSettings(documentId, {
        interfaceName: defaultInterface.name,
      });
    }
  }, [documentId, settings.interfaceName, interfaces.list]);

  useEffect(() => {
    if (!active) return;
    setSacnLevels(buildUniverseFrame(dmxValues, settings.startAddress)).catch(
      (error: unknown) => console.error("Failed to send sACN levels", error),
    );
  }, [active, dmxValues, settings.startAddress]);

  const totalSlots = dmxValues.length;
  const sentSlots = Math.min(
    totalSlots,
    UNIVERSE_SIZE - settings.startAddress + 1,
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
        <LabeledCheckbox
          checked={active}
          disabled={!settings.interfaceName}
          onChange={(checked) => setSacnOutputActive(documentId, checked)}
        >
          <Trans id="deviceClassEditor.sacnOutput.enable">Send sACN</Trans>
        </LabeledCheckbox>
        <div className="flex items-center gap-2">
          <Label htmlFor={interfaceId}>
            <Trans id="deviceClassEditor.sacnOutput.interface">Interface</Trans>
          </Label>
          <Select
            value={settings.interfaceName ?? ""}
            onValueChange={(interfaceName) =>
              updateSacnOutputSettings(documentId, { interfaceName })
            }
            onOpenChange={(open) => {
              if (open) interfaces.refresh();
            }}
          >
            <SelectTrigger id={interfaceId} size="sm" className="bg-background">
              <SelectValue placeholder={_(MESSAGES.selectInterface)} />
            </SelectTrigger>
            <SelectContent>
              {interfaceOptions(interfaces.list, settings.interfaceName).map(
                (option) => (
                  <SelectItem
                    key={option.name}
                    value={option.name}
                    disabled={!option.usable}
                  >
                    <span>{option.name}</span>
                    {option.note && (
                      <span className="text-muted-foreground">
                        {typeof option.note === "string"
                          ? option.note
                          : _(option.note)}
                      </span>
                    )}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <NumberSetting
          label={
            <Trans id="deviceClassEditor.sacnOutput.universe">Universe</Trans>
          }
          value={settings.universe}
          min={MIN_UNIVERSE}
          max={MAX_UNIVERSE}
          onCommit={(universe) =>
            updateSacnOutputSettings(documentId, { universe })
          }
        />
        <NumberSetting
          label={
            <Trans id="deviceClassEditor.sacnOutput.startAddress">
              Start Address
            </Trans>
          }
          value={settings.startAddress}
          min={1}
          max={UNIVERSE_SIZE}
          onCommit={(startAddress) =>
            updateSacnOutputSettings(documentId, { startAddress })
          }
        />
      </div>
      {sentSlots < dmxValues.length && (
        <p className="text-sm text-destructive">
          <Trans id="deviceClassEditor.sacnOutput.slotsDropped">
            Sending only {sentSlots} of {totalSlots} slot(s) due to high start
            address.
          </Trans>
        </p>
      )}
    </div>
  );
};

interface NumberSettingProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

// A number that only takes effect once editing is finished, so that typing
// "12" does not pass through 1 on the way.
const NumberSetting = ({
  label,
  value,
  min,
  max,
  onCommit,
}: NumberSettingProps) => {
  const id = useId();
  const [draft, setDraft] = useState<number | null>(value);
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    setDraft(value);
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>{label}</Label>
      <IntegerInput
        id={id}
        className="w-28"
        inputClassName="h-8 bg-background"
        value={draft}
        min={min}
        max={max}
        onValueChange={setDraft}
        onValueConfirm={(confirmed) => {
          if (confirmed === null) {
            setDraft(value);
          } else if (confirmed !== value) {
            onCommit(confirmed);
          }
        }}
      />
    </div>
  );
};

function useNetworkInterfaces() {
  const { _ } = useLingui();
  const [list, setList] = useState<NetworkInterface[] | null>(null);

  const refresh = useCallback(() => {
    listNetworkInterfaces()
      .then(setList)
      .catch((error: unknown) => {
        toast.error(
          _({
            ...MESSAGES.listInterfacesFailed,
            values: { reason: errorMessage(error) },
          }),
        );
        setList([]);
      });
  }, [_]);

  useEffect(refresh, [refresh]);

  return { list, refresh };
}

interface InterfaceOption {
  name: string;
  usable: boolean;
  // Shown alongside the name: the interface's addresses, or why it cannot be
  // used.
  note?: string | MessageDescriptor;
}

// Lists the interfaces to choose from, keeping the chosen one even when it has
// gone away so the selection still shows what the settings say.
function interfaceOptions(
  interfaces: NetworkInterface[] | null,
  selectedName: string | undefined,
): InterfaceOption[] {
  if (!interfaces) {
    return selectedName ? [{ name: selectedName, usable: true }] : [];
  }

  const options: InterfaceOption[] = interfaces.map((iface) =>
    iface.ipv4Addresses.length > 0
      ? {
          name: iface.name,
          usable: true,
          note: iface.ipv4Addresses.join(", "),
        }
      : { name: iface.name, usable: false, note: MESSAGES.noIpv4Address },
  );

  if (selectedName && !options.some((option) => option.name === selectedName)) {
    options.push({
      name: selectedName,
      usable: false,
      note: MESSAGES.unavailable,
    });
  }

  return options;
}

// Prefers a real network over loopback, which only reaches this computer.
function chooseDefaultInterface(
  interfaces: NetworkInterface[],
): NetworkInterface | undefined {
  const usable = interfaces.filter((iface) => iface.ipv4Addresses.length > 0);
  return usable.find((iface) => !iface.isLoopback) ?? usable[0];
}
