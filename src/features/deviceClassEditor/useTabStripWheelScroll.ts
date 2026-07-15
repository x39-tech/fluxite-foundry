import { useEffect } from "react";
import type { Layout } from "flexlayout-react";

const TAB_STRIP_SELECTOR = ".flexlayout__tabset_tabbar_inner";

// flexlayout-react measures wheel deltas in lines when deltaMode is DOM_DELTA_LINE,
// and uses this same factor internally to convert them to pixels.
const LINES_TO_PIXELS = 40;

/**
 * Lets a tab strip be scrolled by horizontal wheel/trackpad gestures as well as
 * vertical ones.
 *
 * flexlayout-react attaches its own non-passive wheel listener to each tabset
 * that unconditionally calls preventDefault, which kills the browser's native
 * horizontal scrolling, and its replacement only reads deltaY. That leaves
 * side-to-side trackpad gestures doing nothing at all. There is no prop to
 * override the behaviour, so we take the event first, during the capture phase,
 * and stop it from reaching the library's listener.
 *
 * Both axes scroll the strip horizontally, since it only scrolls on one axis and
 * a plain mouse wheel can only produce deltaY.
 */
export const useTabStripWheelScroll = (
  layoutRef: React.RefObject<Layout | null>,
) => {
  useEffect(() => {
    const root = layoutRef.current?.getRootDiv();
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const strip = target.closest(TAB_STRIP_SELECTOR);
      if (!strip) return;

      const { deltaX, deltaY } = event;
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      if (delta === 0) return;

      const scale =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINES_TO_PIXELS : 1;
      strip.scrollLeft += delta * scale;

      event.preventDefault();
      event.stopPropagation();
    };

    root.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => root.removeEventListener("wheel", onWheel, { capture: true });
  }, [layoutRef]);
};
