import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";

interface DmxDisplayProps {
  dmxValues: Uint8Array;
  activeSlots?: Set<number>;
}

export const DmxDisplay = ({ dmxValues, activeSlots }: DmxDisplayProps) => {
  const [dmxDisplayFormat, setDmxDisplayFormat] = useState<"hex" | "decimal">(
    "hex",
  );

  const maxSlot = dmxValues.length;

  // Handle empty slot array gracefully
  if (maxSlot === 0) {
    return (
      <div className="flex flex-row items-center justify-center mt-2 mb-4 sticky">
        <div className="flex flex-col items-center">
          <span className="mx-4 font-bold">DMX Output</span>
          <Select
            value={dmxDisplayFormat}
            onValueChange={(value) =>
              setDmxDisplayFormat(value as "hex" | "decimal")
            }
          >
            <SelectTrigger className="my-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hex">hex</SelectItem>
              <SelectItem value="decimal">decimal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col items-stretch ml-4">
          <div className="text-gray-500 italic">No DMX slots to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-center mt-2 mb-4 sticky">
      <div className="flex flex-col items-center">
        <span className="mx-4 font-bold">DMX Output</span>
        <Select
          value={dmxDisplayFormat}
          onValueChange={(value) =>
            setDmxDisplayFormat(value as "hex" | "decimal")
          }
        >
          <SelectTrigger className="my-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hex">hex</SelectItem>
            <SelectItem value="decimal">decimal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col items-stretch">
        <div className="flex flex-row" key={0}>
          <div key={0} className="flex items-center justify-center w-12 h-8" />
          {[...Array(8).keys()].map((index) => (
            <div
              className="flex items-center justify-center w-12 h-8"
              key={index + 1}
            >
              {index + 1}
            </div>
          ))}
        </div>
        {[...Array(Math.ceil(maxSlot / 8)).keys()].map((outerIndex) => {
          const lastRowIndex = Math.ceil(maxSlot / 8) - 1;
          const columnCount =
            outerIndex === lastRowIndex ? ((maxSlot - 1) % 8) + 1 : 8;
          return (
            <div className="flex flex-row" key={outerIndex + 1}>
              <div className="flex items-center justify-center w-12 h-8">
                {outerIndex * 8}
              </div>
              {[...Array(columnCount).keys()].map((index) => {
                const slotIndex = outerIndex * 8 + index;
                const val = dmxValues[slotIndex];
                const isActive = activeSlots?.has(slotIndex) ?? false;
                const formattedValue = val.toString(
                  dmxDisplayFormat === "hex" ? 16 : 10,
                );
                return (
                  <div
                    key={index}
                    aria-label={
                      isActive ? `${formattedValue} (sequence)` : undefined
                    }
                    className={`flex items-center justify-center border border-gray-500 w-12 h-8 ${
                      isActive ? "text-orange-500 font-bold" : ""
                    }`}
                  >
                    {formattedValue}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
