export function getUniqueItemId(existingItemIds: string[]): string {
  let newItemId = "my-new-item";
  let deDupNumber = 1;

  while (existingItemIds.includes(newItemId)) {
    newItemId = `my-new-item-${deDupNumber++}`;
  }

  return newItemId;
}
