import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useId, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "components/scn-ui/ToggleGroup";
import { cn } from "utils/utils";
import { SELECTED_ITEM } from "./styles";

const MESSAGES = {
  activeSlot: msg({
    id: "deviceClassEditor.dmxDisplay.activeSlot",
    message: "{value} (sequence)",
  }),
  format: msg({
    id: "deviceClassEditor.dmxDisplay.format",
    message: "Number format",
  }),
};

const COLUMNS = 8;

type DisplayFormat = "hex" | "decimal";

interface DmxDisplayProps {
  dmxValues: Uint8Array;
  activeSlots?: Set<number>;
  className?: string;
}

export const DmxDisplay = ({
  dmxValues,
  activeSlots,
  className,
}: DmxDisplayProps) => {
  const { _ } = useLingui();
  const headingId = useId();
  const [format, setFormat] = useState<DisplayFormat>("hex");

  const slotCount = dmxValues.length;
  const rowCount = Math.ceil(slotCount / COLUMNS);

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-h-0 flex-col gap-3 rounded-lg border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-semibold">
          <Trans id="deviceClassEditor.dmxDisplay.title">DMX Output</Trans>
        </h2>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          aria-label={_(MESSAGES.format)}
          value={format}
          // Choosing the selected format again would clear the selection.
          onValueChange={(value) => value && setFormat(value as DisplayFormat)}
        >
          <ToggleGroupItem value="hex" className={SELECTED_ITEM}>
            <Trans id="deviceClassEditor.dmxDisplay.hex">Hex</Trans>
          </ToggleGroupItem>
          <ToggleGroupItem value="decimal" className={SELECTED_ITEM}>
            <Trans id="deviceClassEditor.dmxDisplay.decimal">Decimal</Trans>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {slotCount === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          <Trans id="deviceClassEditor.dmxDisplay.noSlots">
            No DMX slots to display
          </Trans>
        </p>
      ) : (
        <div className="min-h-0 overflow-auto rounded-md border">
          <table className="w-full border-collapse text-center text-sm tabular-nums">
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th className="h-8 w-12" />
                {[...Array(COLUMNS).keys()].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="h-8 min-w-10 px-1 font-medium"
                  >
                    {column + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(rowCount).keys()].map((row) => (
                <tr key={row} className="border-t">
                  <th
                    scope="row"
                    className="h-8 w-12 bg-muted/50 font-semibold"
                  >
                    {row * COLUMNS}
                  </th>
                  {[...Array(COLUMNS).keys()].map((column) => {
                    const slot = row * COLUMNS + column;
                    if (slot >= slotCount) {
                      return <td key={column} />;
                    }

                    const isActive = activeSlots?.has(slot) ?? false;
                    const formattedValue =
                      format === "hex"
                        ? dmxValues[slot].toString(16).padStart(2, "0")
                        : dmxValues[slot].toString();
                    return (
                      <td
                        key={column}
                        aria-label={
                          isActive
                            ? _({
                                ...MESSAGES.activeSlot,
                                values: { value: formattedValue },
                              })
                            : undefined
                        }
                        className={cn(
                          "h-8 px-1",
                          isActive && "font-bold text-orange-500",
                        )}
                      >
                        {formattedValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
