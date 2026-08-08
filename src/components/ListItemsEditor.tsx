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
import { MessageDescriptor } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { EntityId } from "app/persistentState";
import { ItemEditor } from "utils/utils";
import { Toggle } from "./scn-ui/Toggle";
import { Button } from "./scn-ui/Button";
import { Separator } from "./scn-ui/Separator";
import { Input } from "./scn-ui/Input";

/** Localizable strings to display for working with items in the list. */
export interface ListItemsEditorLabels {
  /** Label for the button that adds an item, e.g. "Add Parameter". */
  add: MessageDescriptor;
  /** Label for the button that deletes an item, e.g. "Delete Parameter". */
  delete: MessageDescriptor;
  /**
   * The placeholder for the search box, e.g. "Search Parameters". Leaving this
   * out removes the search box from the component.
   */
  search?: MessageDescriptor;
  /** Shown in place of an editor when there are no items at all. */
  emptyState: MessageDescriptor;
  /** Shown in place of an editor while there are items but none is selected. */
  selectPrompt: MessageDescriptor;
}

interface ListItemsEditorProps {
  editors: ItemEditor[];
  labels: ListItemsEditorLabels;
  // Whether the selected item is titled with a colored icon beside its name.
  showItemIcon?: boolean;
  getEditorTitle?: (editor: ItemEditor) => string;
  getEditorSubtitle?: (editor: ItemEditor) => string | undefined;
  // What the search matches against. Defaults to the values of getEditorTitle
  // and getEditorSubtitle concatenated.
  getEditorSearchText?: (editor: ItemEditor) => string;
  onAddItem?: () => void;
  // Returning false refuses the deletion, and the item stays as it was.
  onDeleteItem?: (editor: ItemEditor) => boolean | void;
  renderActiveEditor: <P extends { key?: React.Key; onDelete?: () => void }>(
    editor: ItemEditor,
  ) => React.ReactElement<P>;
}

export const ListItemsEditor = ({
  editors,
  labels,
  showItemIcon = true,
  getEditorTitle,
  getEditorSubtitle,
  getEditorSearchText,
  onAddItem,
  onDeleteItem,
  renderActiveEditor,
}: ListItemsEditorProps) => {
  const { _ } = useLingui();
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

  const editorSubtitle = useCallback(
    (editor: ItemEditor) => getEditorSubtitle?.(editor),
    [getEditorSubtitle],
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

  const editorSearchText = useCallback(
    (editor: ItemEditor) =>
      getEditorSearchText?.(editor) ??
      [editorTitle(editor), editorSubtitle(editor)]
        .filter((text) => text !== undefined)
        .join(" "),
    [getEditorSearchText, editorTitle, editorSubtitle],
  );

  const visibleEditors = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return editors;
    return editors.filter((editor) =>
      editorSearchText(editor).toLowerCase().includes(query),
    );
  }, [editors, searchText, editorSearchText]);

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
        <div className="flex flex-col max-h-full min-w-2xs max-w-xs border rounded-lg py-5 px-4 gap-2">
          {labels.search && (
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                className="pl-9"
                aria-label={_(labels.search)}
                placeholder={_(labels.search)}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col min-h-0 gap-2 overflow-auto">
            {visibleEditors.map((editor, idx) => (
              <Fragment key={editor.id}>
                <ItemEditorRow
                  ref={
                    editor.id === selectedEditorId
                      ? activeListItemRef
                      : undefined
                  }
                  title={editorTitle(editor)}
                  subtitle={editorSubtitle(editor)}
                  deleteLabel={labels.delete}
                  selected={editor.id === selectedEditorId}
                  onSelect={() => selectEditor(editor)}
                  onDelete={() => deleteEditor(editor)}
                />
                {idx !== visibleEditors.length - 1 && <Separator />}
              </Fragment>
            ))}
          </div>
          <Button onClick={onAddItem}>
            <PlusIcon className="size-4" />
            {_(labels.add)}
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
              <div>
                <div className="text-xl font-semibold">
                  {editorTitle(selectedEditor)}
                </div>
                {editorSubtitle(selectedEditor) && (
                  <div className="text-sm text-muted-foreground">
                    {editorSubtitle(selectedEditor)}
                  </div>
                )}
              </div>
            </div>
            {getActiveEditor(selectedEditor)}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => deleteEditor(selectedEditor)}
              >
                <Trash2Icon />
                <Trans id="listItemsEditor.deleteSelected">Delete</Trans>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
            {_(
              visibleEditors.length === 0
                ? labels.emptyState
                : labels.selectPrompt,
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ItemEditorRowProps {
  ref?: React.Ref<HTMLDivElement>;
  title: string;
  subtitle?: string;
  deleteLabel: MessageDescriptor;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/** One item in the list. */
const ItemEditorRow = ({
  ref,
  title,
  subtitle,
  deleteLabel,
  selected,
  onSelect,
  onDelete,
}: ItemEditorRowProps) => {
  const { _ } = useLingui();

  return (
    <div ref={ref} className="flex items-center gap-1">
      <Toggle
        className="flex-1 min-w-0 h-auto py-1.5 flex-col items-start justify-center gap-0"
        pressed={selected}
        onClick={onSelect}
      >
        <span className="w-full truncate text-left" title={title}>
          {title}
        </span>
        {subtitle && (
          <span
            className="w-full truncate text-left text-xs font-normal text-muted-foreground"
            title={subtitle}
          >
            {subtitle}
          </span>
        )}
      </Toggle>
      <Button
        size="icon"
        aria-label={_(deleteLabel)}
        variant="ghost"
        className={selected ? undefined : "invisible"}
        tabIndex={selected ? undefined : -1}
        aria-hidden={!selected}
        onClick={onDelete}
      >
        <Trash2Icon className="size-4" />
      </Button>
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
