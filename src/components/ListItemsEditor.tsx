import {
  cloneElement,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import { EntityId } from "app/persistentState";
import { cn, ItemEditor } from "utils/utils";
import { Toggle } from "./scn-ui/Toggle";
import { Button } from "./scn-ui/Button";
import { Separator } from "./scn-ui/Separator";
import { Input } from "./scn-ui/Input";

/**
 * Chrome used for the item rows in the editor pane. "icon" gives each item a
 * coloured icon next to its title, while "accordion" gives it a chevron and a
 * dividing rule.
 */
export type ListItemsEditorVariant = "icon" | "accordion";

interface ListItemsEditorProps {
  editors: ItemEditor[];
  itemType: string;
  variant?: ListItemsEditorVariant;
  // When set, a search box filtering the items by title is shown.
  searchPlaceholder?: string;
  getEditorTitle?: (editor: ItemEditor) => string;
  onAddItem?: () => void;
  // Returning false refuses the deletion, and the item stays as it was.
  onDeleteItem?: (editor: ItemEditor) => boolean | void;
  renderActiveEditor: <P extends { key?: React.Key; onDelete?: () => void }>(
    editor: ItemEditor,
  ) => React.ReactElement<P>;
}

export const ListItemsEditor = ({
  editors,
  itemType,
  variant = "icon",
  searchPlaceholder,
  getEditorTitle,
  onAddItem,
  onDeleteItem,
  renderActiveEditor,
}: ListItemsEditorProps) => {
  const [selectedEditorId, setSelectedEditorId] = useState<EntityId | null>(
    null,
  );
  const [searchText, setSearchText] = useState("");
  const activeEditorRef = useRef<HTMLDivElement>(null);
  const activeListItemRef = useRef<HTMLDivElement>(null);
  const knownEditorIds = useRef<Set<EntityId> | null>(null);

  const editorTitle = useCallback(
    (editor: ItemEditor) => getEditorTitle?.(editor) ?? editor.codexId,
    [getEditorTitle],
  );

  // Determine when a new ID is added and select it.
  useEffect(() => {
    const previousIds = knownEditorIds.current;
    knownEditorIds.current = new Set(editors.map((editor) => editor.id));

    if (previousIds === null) return;

    const addedIds = editors
      .map((editor) => editor.id)
      .filter((id) => !previousIds.has(id));

    if (addedIds.length !== 1) return;

    setSelectedEditorId(addedIds[0]);
    setSearchText("");
  }, [editors]);

  const visibleEditors = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return editors;
    return editors.filter((editor) =>
      editorTitle(editor).toLowerCase().includes(query),
    );
  }, [editors, searchText, editorTitle]);

  const selectedIndex = visibleEditors.findIndex(
    (editor) => editor.id === selectedEditorId,
  );

  const scrollActiveItemIntoView = useCallback(() => {
    activeEditorRef.current?.scrollIntoView({ block: "start" });
    // The list only needs to reveal its row, so it scrolls by as little as it
    // can. A row that is already on screen stays where it is.
    activeListItemRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    scrollActiveItemIntoView();
  }, [selectedEditorId, scrollActiveItemIntoView]);

  const selectEditor = (editor: ItemEditor) => {
    if (editor.id === selectedEditorId) {
      scrollActiveItemIntoView();
    } else {
      setSelectedEditorId(editor.id);
    }
  };

  // Once the selected item goes away, fall back to the item that takes its
  // place, or the one before it if it was last.
  const selectNeighbourOf = (editor: ItemEditor) => {
    if (editor.id !== selectedEditorId) return;
    const index = editors.findIndex((e) => e.id === editor.id);
    const neighbour = editors[index + 1] ?? editors[index - 1];
    setSelectedEditorId(neighbour?.id ?? null);
  };

  const deleteEditor = (editor: ItemEditor) => {
    if (onDeleteItem?.(editor) === false) {
      return;
    }
    selectNeighbourOf(editor);
  };

  const getActiveEditor = (editor: ItemEditor) => {
    const editorElem = renderActiveEditor(editor);
    return cloneElement(editorElem, {
      key: editor.id,
      onDelete: () => {
        editorElem.props.onDelete?.();
        selectNeighbourOf(editor);
      },
    });
  };

  return (
    <div className="flex items-start h-full overflow-hidden">
      <div className="flex items-start h-full p-2">
        <div className="flex flex-col max-h-full min-w-3xs border rounded-lg py-5 px-4 gap-2">
          {searchPlaceholder && (
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                className="pl-9"
                aria-label={`Search ${itemType}s`}
                placeholder={searchPlaceholder}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col min-h-0 gap-2 overflow-auto">
            {visibleEditors.map((editor, idx) => (
              <Fragment key={editor.id}>
                <div
                  ref={
                    editor.id === selectedEditorId
                      ? activeListItemRef
                      : undefined
                  }
                  className="relative flex flex-col"
                >
                  <Toggle
                    className="justify-start"
                    pressed={editor.id === selectedEditorId}
                    onClick={() => selectEditor(editor)}
                  >
                    {editorTitle(editor)}
                  </Toggle>
                  <Button
                    size="icon"
                    aria-label={`Delete ${itemType}`}
                    variant="ghost"
                    className={`absolute right-1 ${editor.id === selectedEditorId ? "visible" : "invisible"}`}
                    onClick={() => deleteEditor(editor)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
                {idx !== visibleEditors.length - 1 && <Separator />}
              </Fragment>
            ))}
          </div>
          <Button onClick={onAddItem}>
            <PlusIcon className="size-4" />
            Add {itemType}
          </Button>
        </div>
      </div>
      <div className="relative flex flex-col w-full h-full overflow-auto">
        {variant === "accordion" &&
          visibleEditors.map((editor) => (
            <div
              key={editor.id}
              ref={editor.id === selectedEditorId ? activeEditorRef : undefined}
              className="mx-4 border-b scroll-mt-2"
            >
              <ItemEditorAccordionHeader
                title={editorTitle(editor)}
                expanded={editor.id === selectedEditorId}
                onClick={() => selectEditor(editor)}
              />
              {editor.id === selectedEditorId && (
                <div className="flex flex-col gap-4 pb-4">
                  {getActiveEditor(editor)}
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => deleteEditor(editor)}
                    >
                      <Trash2Icon />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        {variant === "icon" &&
          selectedIndex === -1 &&
          visibleEditors.length > 0 && (
            <div className="px-2 pt-2">
              <Separator />
            </div>
          )}
        {variant === "icon" &&
          visibleEditors.map((editor, idx) => {
            if (selectedIndex === -1) {
              return (
                <Fragment key={editor.id}>
                  <CollapsedItemEditor
                    title={editorTitle(editor)}
                    index={idx}
                    onClick={() => selectEditor(editor)}
                    className="my-4"
                  />
                  <div className="px-2">
                    <Separator />
                  </div>
                </Fragment>
              );
            } else if (idx === selectedIndex) {
              return (
                <div
                  key={editor.id}
                  ref={activeEditorRef}
                  className="min-w-xs rounded-lg bg-accent m-2 scroll-mt-2 px-4 py-5 flex flex-col gap-4"
                >
                  <div className="flex gap-4 items-center">
                    <ItemEditorIcon index={idx} />
                    <div className="text-xl font-semibold pb-1">
                      {editorTitle(editor)}
                    </div>
                  </div>
                  {getActiveEditor(editor)}
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => deleteEditor(editor)}
                    >
                      <Trash2Icon />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            } else if (idx < selectedIndex) {
              return (
                <Fragment key={editor.id}>
                  <div className="pt-2 px-2">
                    <Separator />
                  </div>
                  <CollapsedItemEditor
                    title={editorTitle(editor)}
                    index={idx}
                    onClick={() => selectEditor(editor)}
                    className="mb-2 mt-4"
                  />
                </Fragment>
              );
            } else {
              return (
                <Fragment key={editor.id}>
                  <CollapsedItemEditor
                    title={editorTitle(editor)}
                    index={idx}
                    onClick={() => selectEditor(editor)}
                    className="mt-2 mb-4"
                  />
                  <div className="pb-2 px-2">
                    <Separator />
                  </div>
                </Fragment>
              );
            }
          })}
      </div>
    </div>
  );
};

interface ItemEditorAccordionHeaderProps {
  title: string;
  expanded: boolean;
  onClick: () => void;
}

const ItemEditorAccordionHeader = ({
  title,
  expanded,
  onClick,
}: ItemEditorAccordionHeaderProps) => {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="flex w-full items-center justify-between py-4 font-medium cursor-pointer"
    >
      {title}
      {expanded ? (
        <ChevronUpIcon className="size-4 shrink-0" />
      ) : (
        <ChevronDownIcon className="size-4 shrink-0" />
      )}
    </button>
  );
};

interface CollapsedItemEditorProps {
  title: string;
  index: number;
  onClick: () => void;
  className?: string;
}

const CollapsedItemEditor = ({
  title,
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
      <div className="text-xl font-semibold pb-1">{title}</div>
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
      <Settings2Icon className={`size-6 ${color.svg}`} />
    </div>
  );
};

// Stroke only, no fill: Lucide icons are drawn as strokes over fill="none", and
// the designs show the slider knobs hollow rather than solid.
const COLORS = [
  {
    bg: "bg-teal-100",
    svg: "stroke-teal-500",
  },
  {
    bg: "bg-purple-100",
    svg: "stroke-purple-500",
  },
  {
    bg: "bg-indigo-100",
    svg: "stroke-indigo-500",
  },
  {
    bg: "bg-pink-100",
    svg: "stroke-pink-500",
  },
  {
    bg: "bg-orange-100",
    svg: "stroke-orange-500",
  },
];
