import { useEffect } from "react";
import { Mosaic, MosaicWindow } from "react-mosaic-component";
import { Classes } from "@blueprintjs/core";
import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";
import "./FixtureEditor.scss";
import { useAppSelector } from "app/hooks";

export interface FixtureEditorProps {
  title: string;
}

const ELEMENT_MAP: { [viewId: string]: JSX.Element } = {
  a: <ScalarItemsEditor />,
  b: <StructuredItemsEditor />,
};

const TITLE_MAP: { [viewId: string]: string } = {
  a: "Scalar Items",
  b: "Structured Items",
};

export const FixtureEditor: React.FC<FixtureEditorProps> = ({ title }) => {
  useEffect(() => {
    document.title = `Editing: ${title} -- UDR Builder`;
    return () => {
      document.title = "UDR Builder";
    };
  });

  const darkMode = useAppSelector((state) => state.appSettings.darkMode);

  return (
    <Mosaic<string>
      className={
        darkMode
          ? "mosaic-blueprint-theme " + Classes.DARK
          : "mosaic-blueprint-theme"
      }
      blueprintNamespace={Classes.getClassNamespace()}
      renderTile={(id, path) => (
        <MosaicWindow<string> path={path} title={TITLE_MAP[id]}>
          {ELEMENT_MAP[id]}
        </MosaicWindow>
      )}
      initialValue={{
        direction: "row",
        first: "a",
        second: "b",
        splitPercentage: 50,
      }}
    />
  );
};
