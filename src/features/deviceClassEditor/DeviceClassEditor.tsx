import { useCallback, useEffect, useMemo } from "react";
import {
  Layout,
  Model,
  TabNode,
  Actions,
  DockLocation,
} from "flexlayout-react";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { throttle } from "lodash";
import { nanoid } from "nanoid";
import { APP_NAME } from "consts";
import { RenderError } from "components/RenderError";
import { Button } from "components/scn-ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/scn-ui/DropdownMenu";
import { WIDGETS, isValidWidget } from "./widgets";
import {
  getCurrentEditor,
  setWindowLayout,
  useCurrentEditorId,
  useCurrentEditorPart,
} from "./state";
import { useAppPersistentStore } from "app/store";
import { getDefaultWindowLayout } from "utils/utils";

export const DeviceClassEditor = () => {
  const currentEditorId = useCurrentEditorId();
  const editorName = useCurrentEditorPart((state) => state.basicData.modelName);

  useEffect(() => {
    document.title = `Editing: ${editorName} -- ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [editorName]);

  const onModelChange = useCallback(
    throttle((model) => {
      setWindowLayout(model.toJson());
    }, 1000),
    [],
  );

  // We let the model be 'uncontrolled' (only created on initial render)
  // We keep the saved window layout in sync using onModelChange
  // The alternative results in every widget being rerendered constantly
  const model = useMemo(() => {
    const state = useAppPersistentStore.getState();
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return undefined;
    }

    const model = {
      global: {
        tabEnableRename: false,
        tabSetClassNameTabStrip: "bg-none",
        tabSetEnableMaximize: false,
        borderSize: 500,
        splitterSize: 2,
      },
      borders: [],
    };

    try {
      return Model.fromJson({
        ...model,
        layout: JSON.parse(currentEditor.windowLayout),
      });
    } catch (_e) {
      return Model.fromJson({
        ...model,
        layout: getDefaultWindowLayout(),
      });
    }
  }, [currentEditorId]);

  if (!model) {
    return <RenderError />;
  }

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
            <DropdownMenuTrigger asChild>
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
