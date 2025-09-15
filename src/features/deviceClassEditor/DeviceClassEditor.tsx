import { useCallback, useEffect, useMemo } from "react";
import {
  Layout,
  Model,
  TabNode,
  Actions,
  DockLocation,
  IJsonModel,
} from "flexlayout-react";
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
import { WIDGETS, isValidWidget } from "./widgets";
import { setWindowLayout, useCurrentEditor, useCurrentEditorId } from "./state";

export const DeviceClassEditor = () => {
  const currentEditor = useCurrentEditor();
  const currentEditorId = useCurrentEditorId();
  if (!currentEditor || !currentEditorId) {
    return <RenderError />;
  }

  useEffect(() => {
    document.title = `Editing: ${currentEditor.basicData.info.model.name} -- ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  });

  const modelJson: IJsonModel = {
    global: {
      tabEnableRename: false,
      tabSetClassNameTabStrip: "bg-none",
      tabSetEnableMaximize: false,
      borderSize: 500,
      splitterSize: 2,
    },
    borders: [],
    layout: currentEditor.windowLayout,
  };
  // We let the model be 'uncontrolled' (only created on initial render)
  // We keep the saved window layout in sync using onModelChange
  // The alternative results in every widget being rerendered constantly
  const model = useMemo(() => Model.fromJson(modelJson), [currentEditorId]);

  const onModelChange = useCallback(
    throttle((model) => {
      setWindowLayout(model.toJson());
    }, 1000),
    [],
  );

  const factory = (node: TabNode) => {
    const componentName = node.getComponent();

    if (componentName && isValidWidget(componentName)) {
      return WIDGETS[componentName].factory();
    }
    return <></>;
  };

  return (
    <Layout
      model={model}
      onModelChange={onModelChange}
      factory={factory}
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
  model: Model,
  tabSetId: string,
  componentId: string,
  componentName: string,
) {
  model.doAction(
    Actions.addNode(
      {
        type: "tab",
        name: componentName,
        component: componentId,
        id: nanoid(),
      },
      tabSetId,
      DockLocation.CENTER,
      -1,
    ),
  );
}
