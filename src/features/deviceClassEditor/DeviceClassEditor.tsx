import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Layout,
  Model,
  TabNode,
  Actions,
  DockLocation,
} from "flexlayout-react";
import { PlusIcon } from "lucide-react";
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
import { useTabStripWheelScroll } from "./useTabStripWheelScroll";
import { useTabStripScrollIndicators } from "./useTabStripScrollIndicators";
import {
  getCurrentEditor,
  setWindowLayout,
  useCurrentEditorId,
  useCurrentEditorPart,
} from "./state";
import { useAppPersistentStore } from "app/store";
import { getDefaultWindowLayout } from "utils/utils";

const MESSAGES = {
  windowTitle: msg({
    id: "deviceClassEditor.windowTitle",
    message: "Editing: {editorName} -- {appName}",
  }),
  unknownWidget: msg({
    id: "deviceClassEditor.unknownWidget",
    message: "Unknown Editor",
  }),
};

const UNKNOWN_WIDGET = MESSAGES.unknownWidget;

export const DeviceClassEditor = () => {
  const currentEditorId = useCurrentEditorId();
  const editorName = useCurrentEditorPart((state) => state.basicData.modelName);
  const layoutRef = useRef<Layout>(null);
  const { _ } = useLingui();

  useTabStripWheelScroll(layoutRef);
  useTabStripScrollIndicators(layoutRef);

  useEffect(() => {
    document.title = _({
      ...MESSAGES.windowTitle,
      values: { editorName, appName: APP_NAME },
    });
    return () => {
      document.title = APP_NAME;
    };
  }, [editorName, _]);

  const onModelChange = useCallback(
    throttle((model) => {
      if (currentEditorId) {
        setWindowLayout(currentEditorId, model.toJson());
      }
    }, 1000),
    [currentEditorId],
  );

  // We let the model be 'uncontrolled' (only created on initial render)
  // We keep the saved window layout in sync using onModelChange
  // The alternative results in every widget being rerendered constantly
  const model = useMemo(() => {
    const state = useAppPersistentStore.getState();
    if (!currentEditorId || !getCurrentEditor(state)) {
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
        layout: JSON.parse(state.session.layouts[currentEditorId]),
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
      ref={layoutRef}
      model={model}
      onModelChange={onModelChange}
      factory={factory}
      onRenderTabSet={(tabSetNode, renderValues) => {
        const tabSetId = tabSetNode.getId();
        renderValues.buttons = [
          <DropdownMenu key={1}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <PlusIcon className="size-4" />
                <Trans id="deviceClassEditor.addTab">Add Tab</Trans>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-0.5">
              {Object.entries(WIDGETS).map(([widgetId, widgetDesc]) => {
                return (
                  <DropdownMenuItem
                    key={widgetId}
                    onClick={() =>
                      addNewWidget(
                        model,
                        tabSetId,
                        widgetId,
                        _(widgetDesc.name),
                      )
                    }
                  >
                    {_(widgetDesc.name)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>,
        ];
        renderValues.overflowPosition = 1;
      }}
      onRenderTab={(node, renderValues) => {
        const widget = WIDGETS[node.getComponent() || ""];
        renderValues.content = widget ? _(widget.name) : _(UNKNOWN_WIDGET);
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
