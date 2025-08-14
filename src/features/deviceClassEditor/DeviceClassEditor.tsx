import { useCallback, useEffect } from "react";
import * as FlexLayout from "flexlayout-react";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { throttle } from "lodash";
import { nanoid } from "nanoid";
import { APP_NAME } from "appInfo";
import { RenderError } from "components/RenderError";
import { Button } from "components/scn-ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/scn-ui/DropdownMenu";
import { useDarkMode } from "app/store";
import { WIDGETS, isValidWidget } from "./widgets";
import { setWindowLayout, useCurrentEditor } from "./state";

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
      tabSetClassNameTabStrip: "bg-none",
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
          <DropdownMenu key={1}>
            <DropdownMenuTrigger>
              <Button
                size="icon"
                variant="ghost"
                className="size-6 align-middle"
                aria-label="Add new widget"
              >
                <PlusCircleIcon className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-0.5">
              {Object.entries(WIDGETS).map(([widgetId, widgetDesc]) => {
                return (
                  <DropdownMenuItem
                    key={widgetId}
                    onClick={() =>
                      addNewWidget(model, tabSetId, widgetId, widgetDesc.name)
                    }
                  >
                    {widgetDesc.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>,
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
