import { clsx, type ClassValue } from "clsx";
import { IJsonRowNode } from "flexlayout-react";
import { nanoid } from "nanoid";
import { twMerge } from "tailwind-merge";

export function getUniqueItemId(
  existingItemIds: string[],
  defaultId: string = "my-new-item",
): string {
  let newItemId = defaultId;
  let deDupNumber = 1;

  while (existingItemIds.includes(newItemId)) {
    newItemId = `${defaultId}-${deDupNumber++}`;
  }

  return newItemId;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDefaultWindowLayout(): IJsonRowNode {
  return {
    type: "row",
    weight: 100,
    id: nanoid(),
    children: [
      {
        type: "tabset",
        weight: 50,
        id: nanoid(),
        children: [
          {
            type: "tab",
            name: "Parameters Editor",
            component: "parametersEditor",
            id: nanoid(),
          },
        ],
      },
      {
        type: "tabset",
        weight: 50,
        id: nanoid(),
        children: [
          {
            type: "tab",
            name: "Device Info Editor",
            component: "deviceInfoEditor",
            id: nanoid(),
          },
        ],
      },
    ],
  };
}

// Formats a human-readable file size using 1000 as the divisor
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1000;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
