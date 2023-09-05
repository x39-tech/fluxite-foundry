import { useEffect, useMemo } from "react";
import * as FlexLayout from "flexlayout-react";
import { nanoid } from "@reduxjs/toolkit";
import { Button } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { throttle } from "lodash";

import {
  useAppDispatch,
  useAppSelector,
  useCurrentEditorSelector,
} from "app/hooks";
import { WIDGETS, isValidWidget } from "./widgets";
import { NewWidgetMenu } from "./newWidgetMenu";
import { windowLayoutUpdated } from "./deviceClassEditorSlice";
import "./DeviceClassEditor.scss";

interface Props {
  title: string;
}

export const DeviceClassEditor = ({ title }: Props) => {
  useEffect(() => {
    document.title = `Editing: ${title} -- UDR Builder`;
    return () => {
      document.title = "UDR Builder";
    };
  });

  const darkMode = useAppSelector((state) => state.appSettings.darkMode);
  const flexlayoutClassPrefix = darkMode
    ? "flexlayout-dark "
    : "flexlayout-light ";

  const modelJson: FlexLayout.IJsonModel = {
    global: {
      tabEnableRename: false,
      tabSetClassNameTabStrip: "udr-builder-tabstrip",
      borderSize: 500,
      splitterSize: 2,
    },
    borders: [],
    layout: useCurrentEditorSelector((state) => state.windowLayout),
  };
  const model = FlexLayout.Model.fromJson(modelJson);

  const onModelChange = useMemo(
    () =>
      throttle((model) => {
        dispatch(windowLayoutUpdated(model.toJson()));
      }, 1000),
    [],
  );

  const factory = (node: FlexLayout.TabNode) => {
    const componentName = node.getComponent();

    if (componentName && isValidWidget(componentName)) {
      return WIDGETS[componentName].factory();
    }
    return <></>;
  };

  const dispatch = useAppDispatch();

  return (
    <FlexLayout.Layout
      model={model}
      onModelChange={onModelChange}
      factory={factory}
      classNameMapper={(defaultName) => {
        return flexlayoutClassPrefix + defaultName;
      }}
      onRenderTabSet={(tabSetNode, renderValues) => {
        const tabSetId = tabSetNode.getId();
        renderValues.stickyButtons = [
          <Popover2
            key="1"
            content={
              <NewWidgetMenu
                onNewWidgetSelected={(id, name) =>
                  addNewWidget(model, tabSetId, id, name)
                }
              />
            }
          >
            <Button icon="add" minimal />
          </Popover2>,
        ];
      }}
      onRenderTab={(node, renderValues) => {
        renderValues.content =
          WIDGETS[node.getComponent() || ""]?.name || "Unknown Editor";
      }}
      realtimeResize
      icons={{
        maximize: () => <></>,
      }}
    />
  );
};

function addNewWidget(
  model: FlexLayout.Model,
  tabSetId: string,
  componentId: string,
  componentName: string,
) {
  model.doAction(
    FlexLayout.Actions.addNode(
      {
        type: "tab",
        name: componentName,
        component: componentId,
        id: nanoid(),
      },
      tabSetId,
      FlexLayout.DockLocation.CENTER,
      -1,
    ),
  );
}
