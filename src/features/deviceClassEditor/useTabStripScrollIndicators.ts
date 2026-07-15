import { useEffect } from "react";
import type { Layout } from "flexlayout-react";

const TAB_STRIP_SELECTOR = ".flexlayout__tabset_tabbar_inner";

// Scroll positions and element widths are fractional, so the ends of the range
// are never landed on exactly.
const EDGE_TOLERANCE = 1;

/**
 * Marks each tab strip's track with `data-tabs-before` / `data-tabs-after`
 * according to whether tabs are scrolled out of view on that side, so the
 * stylesheet can show an indicator pointing that way.
 *
 * flexlayout-react keeps its scroll state internal and offers no hook for this,
 * so the state is read back off the DOM instead.
 */
export const useTabStripScrollIndicators = (
  layoutRef: React.RefObject<Layout | null>,
) => {
  useEffect(() => {
    const root = layoutRef.current?.getRootDiv();
    if (!root) return;

    const update = (strip: Element) => {
      // The track is the strip's parent, since the strip itself scrolls and an
      // indicator drawn on it would scroll away with the tabs.
      const track = strip.parentElement;
      if (!track) return;

      const maxScroll = strip.scrollWidth - strip.clientWidth;
      const scrollable = maxScroll > EDGE_TOLERANCE;

      track.toggleAttribute(
        "data-tabs-before",
        scrollable && strip.scrollLeft > EDGE_TOLERANCE,
      );
      track.toggleAttribute(
        "data-tabs-after",
        scrollable && strip.scrollLeft < maxScroll - EDGE_TOLERANCE,
      );
    };

    const strips = () => root.querySelectorAll(TAB_STRIP_SELECTOR);
    const updateAll = () => strips().forEach(update);

    // Scroll events don't bubble, so they have to be caught on the way down.
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.matches(TAB_STRIP_SELECTOR)) {
        update(target);
      }
    };
    root.addEventListener("scroll", onScroll, { capture: true });

    // Resizing a pane changes how many tabs fit without ever firing a scroll
    // event. Both the strip and the row of tabs inside it are watched: the
    // first covers the pane resizing, the second covers tabs being added,
    // removed or renamed.
    const resizeObserver = new ResizeObserver(updateAll);
    const observeStrips = () => {
      resizeObserver.disconnect();
      strips().forEach((strip) => {
        resizeObserver.observe(strip);
        if (strip.firstElementChild) {
          resizeObserver.observe(strip.firstElementChild);
        }
      });
    };

    // Splitting or closing a pane adds and removes whole tab strips.
    const mutationObserver = new MutationObserver(() => {
      observeStrips();
      updateAll();
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    observeStrips();
    updateAll();

    return () => {
      root.removeEventListener("scroll", onScroll, { capture: true });
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [layoutRef]);
};
