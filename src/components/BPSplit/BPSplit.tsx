import Split, { SplitProps } from "react-split";
import "./BPSplit.css";

export const BPSplit: React.FC<SplitProps> = (props) => {
  return (
    <Split
      gutter={() => {
        // Encompassing div is necessary so it can have the proper flex layout to contain the
        // zero-width bp4-divider div
        const gutter = document.createElement("div");
        gutter.className = "gutter";

        const gutterDivider = document.createElement("div");
        gutterDivider.className = "gutter-divider bp4-divider";

        gutter.appendChild(gutterDivider);
        return gutter;
      }}
      gutterStyle={() => {
        return {};
      }}
      {...props}
    ></Split>
  );
};
