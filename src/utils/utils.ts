import { clsx, type ClassValue } from "clsx";
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
