import {
  cloneElement,
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { cn, ItemEditor } from "utils/utils";
import { Toggle } from "./scn-ui/Toggle";
import { Button } from "./scn-ui/Button";
import { Separator } from "./scn-ui/Separator";

interface ListItemsEditorProps {
  editors: ItemEditor[];
  itemType: string;
  getEditorTitle?: (editor: ItemEditor) => string;
  onAddItem?: () => void;
  onDeleteItem?: (editor: ItemEditor) => void;
  renderActiveEditor: <P extends { key?: React.Key; onDelete?: () => void }>(
    editor: ItemEditor,
  ) => React.ReactElement<P>;
}

export const ListItemsEditor = ({
  editors,
  itemType,
  getEditorTitle,
  onAddItem,
  onDeleteItem,
  renderActiveEditor,
}: ListItemsEditorProps) => {
  const [selectedEditorIndex, setSelectedEditorIndex] = useState<number | null>(
    null,
  );
  const activeEditorRef = useRef<HTMLDivElement>(null);

  const scrollActiveEditorIntoView = useCallback(() => {
    activeEditorRef.current?.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    scrollActiveEditorIntoView();
  }, [selectedEditorIndex, scrollActiveEditorIntoView]);

  const selectEditor = (idx: number) => {
    if (idx === selectedEditorIndex) {
      scrollActiveEditorIntoView();
    } else {
      setSelectedEditorIndex(idx);
    }
  };

  const reselectEditorId = () => {
    if (editors.length <= 1 || selectedEditorIndex === null) {
      setSelectedEditorIndex(null);
    } else if (selectedEditorIndex === editors.length - 1) {
      setSelectedEditorIndex(selectedEditorIndex - 1);
    }
  };

  const getActiveEditor = (editor: ItemEditor, idx: number) => {
    const editorElem = renderActiveEditor(editor);
    return cloneElement(editorElem, {
      key: idx,
      onDelete: () => {
        editorElem.props.onDelete?.();
        reselectEditorId();
      },
    });
  };

  return (
    <div className="flex items-start h-full overflow-hidden">
      <div className="flex items-start h-full p-2">
        <div className="flex flex-col max-h-full min-w-3xs border rounded-lg py-5 px-4 gap-2">
          <div className="flex flex-col min-h-0 gap-2 overflow-auto">
            {editors.map((editor, idx) => (
              <Fragment key={idx}>
                <div className="relative flex flex-col">
                  <Toggle
                    className="justify-start"
                    pressed={idx == selectedEditorIndex}
                    onClick={() => selectEditor(idx)}
                  >
                    {editor.codexId}
                  </Toggle>
                  <Button
                    size="icon"
                    aria-label={`Delete ${itemType}`}
                    variant="ghost"
                    className={`absolute right-1 ${idx === selectedEditorIndex ? "visible" : "invisible"}`}
                    onClick={() => {
                      onDeleteItem?.(editor);
                      reselectEditorId();
                    }}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
                {idx !== editors.length - 1 && <Separator />}
              </Fragment>
            ))}
          </div>
          <Button onClick={onAddItem}>
            <PlusIcon className="size-4" />
            Add {itemType}
          </Button>
        </div>
      </div>
      <div className="flex flex-col w-full h-full overflow-auto">
        {selectedEditorIndex === null && editors.length > 0 && (
          <div className="px-2 pt-2">
            <Separator />
          </div>
        )}
        {editors.map((editor, idx) => {
          if (selectedEditorIndex === null) {
            return (
              <Fragment key={idx}>
                <CollapsedItemEditor
                  id={editor.codexId}
                  index={idx}
                  onClick={() => selectEditor(idx)}
                  className="my-4"
                />
                <div className="px-2">
                  <Separator />
                </div>
              </Fragment>
            );
          } else {
            if (idx === selectedEditorIndex) {
              return (
                <div
                  key={idx}
                  ref={activeEditorRef}
                  className="min-w-xs rounded-lg bg-accent m-2 scroll-mt-2 px-4 py-5 flex flex-col gap-4"
                >
                  <div className="flex gap-4 items-center">
                    <ItemEditorIcon index={idx} />
                    <div className="text-xl font-semibold pb-1">
                      {getEditorTitle?.(editor) || editor.codexId}
                    </div>
                  </div>
                  {getActiveEditor(editor, idx)}
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => onDeleteItem?.(editor)}
                    >
                      <TrashIcon />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            } else if (idx < selectedEditorIndex) {
              return (
                <Fragment key={idx}>
                  <div className="pt-2 px-2">
                    <Separator />
                  </div>
                  <CollapsedItemEditor
                    id={editor.codexId}
                    index={idx}
                    onClick={() => selectEditor(idx)}
                    className="mb-2 mt-4"
                  />
                </Fragment>
              );
            } else {
              return (
                <Fragment key={idx}>
                  <CollapsedItemEditor
                    id={editor.codexId}
                    index={idx}
                    onClick={() => selectEditor(idx)}
                    className="mt-2 mb-4"
                  />
                  <div className="pb-2 px-2">
                    <Separator />
                  </div>
                </Fragment>
              );
            }
          }
        })}
      </div>
    </div>
  );
};

interface CollapsedItemEditorProps {
  id: string;
  index: number;
  onClick: () => void;
  className?: string;
}

const CollapsedItemEditor = ({
  id,
  index,
  onClick,
  className,
}: CollapsedItemEditorProps) => {
  return (
    <div
      className={cn("ml-6 flex gap-4 items-center cursor-pointer", className)}
      onClick={onClick}
    >
      <ItemEditorIcon index={index} />
      <div className="text-xl font-semibold pb-1">{id}</div>
    </div>
  );
};

interface Props {
  index: number;
}

const ItemEditorIcon = ({ index }: Props) => {
  const color = COLORS[index % COLORS.length];

  return (
    <div
      className={`w-[44px] h-[44px] rounded-full flex justify-center items-center ${color.bg}`}
    >
      <AdjustmentsHorizontalIcon className={`size-6 ${color.svg}`} />
    </div>
  );
};

const COLORS = [
  {
    bg: "bg-teal-100",
    svg: "fill-teal-500 stroke-teal-500",
  },
  {
    bg: "bg-purple-100",
    svg: "fill-purple-500 stroke-purple-500",
  },
  {
    bg: "bg-indigo-100",
    svg: "fill-indigo-500 stroke-indigo-500",
  },
  {
    bg: "bg-pink-100",
    svg: "fill-pink-500 stroke-pink-500",
  },
  {
    bg: "bg-orange-100",
    svg: "fill-orange-500 stroke-orange-500",
  },
];
