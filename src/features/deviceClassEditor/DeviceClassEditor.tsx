import { useEffect } from "react";
import { Mosaic, MosaicWindow } from "react-mosaic-component";
import { Classes } from "@blueprintjs/core";
import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";
import {
  useAppDispatch,
  useAppSelector,
  useCurrentEditorSelector,
} from "app/hooks";
import { windowLayoutUpdated } from "./deviceClassEditorSlice";
import { DeviceClassEditorWindowType } from "./deviceClassEditorState";
import "./DeviceClassEditor.scss";

export interface DeviceClassEditorProps {
  title: string;
}

const ELEMENT_MAP: { [type in DeviceClassEditorWindowType]: JSX.Element } = {
  [DeviceClassEditorWindowType.ScalarItemsEditor]: <ScalarItemsEditor />,
  [DeviceClassEditorWindowType.StructuredItemsEditor]: (
    <StructuredItemsEditor />
  ),
};

const TITLE_MAP: { [type in DeviceClassEditorWindowType]: string } = {
  [DeviceClassEditorWindowType.ScalarItemsEditor]: "Scalar Items",
  [DeviceClassEditorWindowType.StructuredItemsEditor]: "Structured Items",
};

export const DeviceClassEditor: React.FC<DeviceClassEditorProps> = ({
  title,
}) => {
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
