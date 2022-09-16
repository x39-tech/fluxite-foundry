import { useEffect } from "react";
import { Mosaic, MosaicWindow } from "react-mosaic-component";
import { Classes } from "@blueprintjs/core";
import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { windowLayoutUpdated } from "./fixtureEditorSlice";
import { FixtureEditorWindowType } from "./fixtureEditorState";
import { useCurrentEditorSelector } from "./fixtureEditorsState";
import "./FixtureEditor.scss";

export interface FixtureEditorProps {
  title: string;
}

const ELEMENT_MAP: { [type in FixtureEditorWindowType]: JSX.Element } = {
  [FixtureEditorWindowType.ScalarItemsEditor]: <ScalarItemsEditor />,
  [FixtureEditorWindowType.StructuredItemsEditor]: <StructuredItemsEditor />,
};

const TITLE_MAP: { [type in FixtureEditorWindowType]: string } = {
  [FixtureEditorWindowType.ScalarItemsEditor]: "Scalar Items",
  [FixtureEditorWindowType.StructuredItemsEditor]: "Structured Items",
};

export const FixtureEditor: React.FC<FixtureEditorProps> = ({ title }) => {
  useEffect(() => {
    document.title = `Editing: ${title} -- UDR Builder`;
    return () => {
      document.title = "UDR Builder";
    };
  });

  const darkMode = useAppSelector((state) => state.appSettings.darkMode);

  const [windowLayout, windowTypes] = useCurrentEditorSelector((state) => [
    state.windowLayout,
    state.windowTypes,
  ]);

  const dispatch = useAppDispatch();

  return (
    <Mosaic<string>
      className={
        darkMode
          ? "mosaic-blueprint-theme " + Classes.DARK
          : "mosaic-blueprint-theme"
      }
      blueprintNamespace={Classes.getClassNamespace()}
      renderTile={(id, path) => (
        <MosaicWindow<string> path={path} title={TITLE_MAP[windowTypes[id]]}>
          {ELEMENT_MAP[windowTypes[id]]}
        </MosaicWindow>
      )}
      initialValue={windowLayout}
      onRelease={(newNode) => dispatch(windowLayoutUpdated(newNode))}
    />
  );
};
