import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { MinusIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "components/scn-ui/Button";

interface Props {
  title: string;
  expanded?: boolean;
  onDelete: () => void;
  children: React.ReactNode;
}

export const ItemEditor = ({
  title,
  expanded = false,
  onDelete,
  children,
}: Props) => {
  return (
    <Disclosure defaultOpen={expanded}>
      <div className="rounded-sm py-2 pl-3 pr-2 m-1 flex flex-col bg-gray-200 dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <DisclosureButton as="div">
            {({ open }) => (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Expand ${title}`}
                className="opacity-80"
              >
                {open ? <MinusIcon /> : <PlusIcon />}
              </Button>
            )}
          </DisclosureButton>
          <h2 className="text-lg">{title}</h2>
          <div className="flex-grow" />
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            aria-label={`Delete ${title}`}
          >
            <TrashIcon />
          </Button>
        </div>
        <div className="overflow-hidden">
          <DisclosurePanel
            transition
            className="origin-top transition duration-200 ease-out data-closed:-translate-y-10 data-closed:opacity-0"
          >
            <div className="pt-2">{children}</div>
          </DisclosurePanel>
        </div>
      </div>
    </Disclosure>
  );
};
