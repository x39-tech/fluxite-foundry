import { useLayoutEffect, useState } from "react";

/**
 * Tracks the rendered width of an element. Undefined until the element has
 * been measured.
 *
 * A width of zero is ignored and the last known width is kept, because an
 * element that is hidden (e.g. in a layout tab that isn't showing) measures as
 * zero wide without its real size having changed.
 */
export function useElementWidth(element: HTMLElement | null) {
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    if (!element) return;

    const update = (newWidth: number) => {
      if (newWidth > 0) setWidth(newWidth);
    };

    // Measure up front so the first paint already has the right layout rather
    // than waiting for the observer's first report.
    update(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return width;
}
