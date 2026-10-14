import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { PanelLeftOpenIcon, XIcon } from "lucide-react";
import { cn } from "utils/utils";
import { useElementWidth } from "hooks/useElementWidth";
import { Button } from "./scn-ui/Button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "./scn-ui/Sheet";

const LABELS = {
  sidebar: msg({ id: "sidebarLayout.sidebar", message: "Sidebar" }),
  open: msg({ id: "sidebarLayout.open", message: "Show sidebar" }),
  close: msg({ id: "sidebarLayout.close", message: "Hide sidebar" }),
};

interface SidebarLayoutContextValue {
  collapsed: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  // The layout's root element, which the collapsed sidebar is portaled into
  // so that it overlays only this layout rather than the whole page.
  container: HTMLElement | null;
  registerTrigger: () => () => void;
}

const SidebarLayoutContext = createContext<SidebarLayoutContextValue | null>(
  null,
);

function useSidebarLayoutContext() {
  const context = useContext(SidebarLayoutContext);
  if (!context) {
    throw new Error("SidebarLayout parts must be rendered in a SidebarLayout.");
  }
  return context;
}

/**
 * Gives content inside a SidebarLayout control over the sidebar, e.g. to
 * close it once the user has picked something from it.
 */
export function useSidebarLayout() {
  const { collapsed, open, setOpen } = useSidebarLayoutContext();
  const close = useCallback(() => setOpen(false), [setOpen]);
  return { collapsed, open, close };
}

interface SidebarLayoutProps {
  /**
   * Below this width in pixels, the sidebar collapses and is shown on demand
   * as a drawer over the main content.
   */
  collapseBelow?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * A layout of a sidebar beside main content. Compose it from a
 * SidebarLayoutSidebar and a SidebarLayoutMain.
 *
 * When the layout is narrow, the sidebar collapses to a slim rail with a
 * button to show it. To put that button somewhere else, render a
 * SidebarLayoutTrigger and the rail is left out.
 */
export function SidebarLayout({
  collapseBelow = 680,
  className,
  children,
}: SidebarLayoutProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);

  const width = useElementWidth(root);
  const collapsed = width !== undefined && width < collapseBelow;

  // A drawer left open when the layout widens shouldn't reappear by itself
  // the next time it narrows.
  useEffect(() => {
    if (!collapsed) setOpen(false);
  }, [collapsed]);

  const registerTrigger = useCallback(() => {
    setTriggerCount((count) => count + 1);
    return () => setTriggerCount((count) => count - 1);
  }, []);

  const context = useMemo(
    () => ({
      collapsed,
      open: collapsed && open,
      setOpen,
      container: root,
      registerTrigger,
    }),
    [collapsed, open, root, registerTrigger],
  );

  return (
    <SidebarLayoutContext value={context}>
      <Sheet open={context.open} onOpenChange={setOpen} modal={false}>
        <div
          ref={setRoot}
          className={cn("relative flex h-full overflow-hidden", className)}
        >
          {collapsed && triggerCount === 0 && (
            <div className="shrink-0 p-2">
              <TriggerButton />
            </div>
          )}
          {children}
          {context.open && (
            <div
              aria-hidden
              className="absolute inset-0 z-40 bg-black/50 animate-in fade-in-0"
            />
          )}
        </div>
      </Sheet>
    </SidebarLayoutContext>
  );
}

interface SidebarLayoutSidebarProps {
  /** Defaults to "Sidebar". */
  label?: string;
  className?: string;
  children: React.ReactNode;
}

export function SidebarLayoutSidebar({
  label,
  className,
  children,
}: SidebarLayoutSidebarProps) {
  const { _ } = useLingui();
  const { collapsed, container } = useSidebarLayoutContext();
  const accessibleLabel = label ?? _(LABELS.sidebar);

  if (!collapsed) {
    return (
      <aside
        aria-label={accessibleLabel}
        className={cn("h-full shrink-0", className)}
      >
        {children}
      </aside>
    );
  }

  return (
    <SheetContent
      side="left"
      container={container}
      showCloseButton={false}
      aria-describedby={undefined}
      // Leaves room beside the drawer for its close button.
      className="absolute w-auto max-w-[calc(100%-3.5rem)] sm:max-w-[calc(100%-3.5rem)] gap-0"
    >
      <SheetTitle className="sr-only">{accessibleLabel}</SheetTitle>
      <div className={cn("h-full min-h-0", className)}>{children}</div>
      <SheetClose asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label={_(LABELS.close)}
          className="absolute top-2 -right-12"
        >
          <XIcon />
        </Button>
      </SheetClose>
    </SheetContent>
  );
}

export function SidebarLayoutMain({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative h-full min-w-0 flex-1", className)}
      {...props}
    />
  );
}

/**
 * A button that shows the collapsed sidebar. It is only rendered while the
 * sidebar is collapsed.
 */
export function SidebarLayoutTrigger({ className }: { className?: string }) {
  const { collapsed, registerTrigger } = useSidebarLayoutContext();

  // Registered before paint so that the default rail never flashes up.
  useLayoutEffect(() => registerTrigger(), [registerTrigger]);

  return collapsed ? <TriggerButton className={className} /> : null;
}

const TriggerButton = ({ className }: { className?: string }) => {
  const { _ } = useLingui();

  return (
    <SheetTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label={_(LABELS.open)}
        className={className}
      >
        <PanelLeftOpenIcon />
      </Button>
    </SheetTrigger>
  );
};
