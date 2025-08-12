import { useState, useEffect, useRef } from "react";

interface UseTextWidthOptions {
  texts: string[];
  font?: {
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
  };
  extraWidth?: number; // Additional padding/margin to add
  minWidth?: number;
  maxWidth?: number;
}

export function useTextWidth({
  texts,
  font,
  extraWidth = 0,
  minWidth = 40,
  maxWidth = 400,
}: UseTextWidthOptions) {
  const [width, setWidth] = useState<number>(0);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let width = 0;

    texts.forEach((text) => {
      if (measureRef.current) {
        measureRef.current.textContent = text;
        const textWidth = measureRef.current.scrollWidth;
        width = Math.max(width, textWidth);
      } else {
        width = Math.max(width, text.length * 8); // Fallback heuristic
      }
    });

    width = Math.max(minWidth, Math.min(maxWidth, width));
    setWidth(width + extraWidth);
  }, [texts, extraWidth]);

  const MeasuringElement = (
    <div
      ref={measureRef}
      className="fixed -top-full left-0 invisible whitespace-nowrap"
      style={font ? { ...font } : {}}
    />
  );

  return { width, MeasuringElement };
}
