import { useCallback, useEffect } from "react";
import * as FlexLayout from "flexlayout-react";
import { Popover2 } from "@blueprintjs/popover2";
import { throttle } from "lodash";
import { nanoid } from "nanoid";
import { APP_NAME } from "appInfo";
import { RenderError } from "utils/components/RenderError";
import { Button } from "utils/components/Button";
import { useDarkMode } from "app/store";
import { WIDGETS, isValidWidget } from "./widgets";
import { NewWidgetMenu } from "./newWidgetMenu";
import { setWindowLayout, useCurrentEditor } from "./state";
import "./DeviceClassEditor.scss";

export const DeviceClassEditor = () => {
  const currentEditor = useCurrentEditor();
  if (!currentEditor) {
    return <RenderError />;
  }

  useEffect(() => {
    document.title = `Editing: ${currentEditor.basicData.info.model.name} -- ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  });

  const darkMode = useDarkMode();
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
    layout: currentEditor.windowLayout,
  };
  const model = FlexLayout.Model.fromJson(modelJson);

  const onModelChange = useCallback(
    throttle((model) => {
      setWindowLayout(model.toJson());
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
            <Button
              minimal
              icon="PlusCircleIcon"
              iconType="outline"
              iconSize={5}
              aria-label="Add new widget"
            />
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
