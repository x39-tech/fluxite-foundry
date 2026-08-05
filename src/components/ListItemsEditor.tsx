import {
  cloneElement,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlusIcon, SearchIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { EntityId } from "app/persistentState";
import { ItemEditor } from "utils/utils";
import { Toggle } from "./scn-ui/Toggle";
import { Button } from "./scn-ui/Button";
import { Separator } from "./scn-ui/Separator";
import { Input } from "./scn-ui/Input";

interface ListItemsEditorProps {
  editors: ItemEditor[];
  itemType: string;
  // Whether the selected item is titled with a colored icon beside its name.
  showItemIcon?: boolean;
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
  showItemIcon = true,
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

  const selectedEditor = visibleEditors.find(
    (editor) => editor.id === selectedEditorId,
  );

  const selectedIndex = editors.findIndex(
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
        {selectedEditor ? (
          <div
            ref={activeEditorRef}
            className="min-w-xs m-2 scroll-mt-2 px-4 py-5 flex flex-col gap-4"
          >
            <div className="flex gap-4 items-center">
              {showItemIcon && <ItemEditorIcon index={selectedIndex} />}
              <div className="text-xl font-semibold pb-1">
                {editorTitle(selectedEditor)}
              </div>
            </div>
            {getActiveEditor(selectedEditor)}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => deleteEditor(selectedEditor)}
              >
                <Trash2Icon />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
            {visibleEditors.length === 0
              ? `Add a ${itemType} to start editing`
              : `Select a ${itemType} to start editing`}
          </div>
        )}
      </div>
    </div>
  );
};

interface ItemEditorIconProps {
  index: number;
}

const ItemEditorIcon = ({ index }: ItemEditorIconProps) => {
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
