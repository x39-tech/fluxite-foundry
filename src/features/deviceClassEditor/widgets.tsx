import { JSX } from "react";
import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { ParametersEditor } from "./parametersEditor/ParametersEditor";
import { DeviceInfoEditor } from "./deviceInfoEditor/DeviceInfoEditor";
import { DmxEditor } from "./dmxEditor/DmxEditor";
import { DmxController } from "./controller/DmxController";
import { ResourcesEditor } from "./resourcesEditor/ResourcesEditor";
import { CommandsEditor } from "./commandsEditor/CommandsEditor";
import { ClassesEditor } from "features/classEditors/ClassesEditor";
import { DeviceClassClassEditing } from "./classEditing";

interface EditorWidget {
  name: MessageDescriptor;
  description: MessageDescriptor;
  factory: () => JSX.Element;
}

export const WIDGETS: Record<string, EditorWidget> = {
  parametersEditor: {
    name: msg({
      id: "deviceClassEditor.widget.parametersEditor.name",
      message: "Parameters",
    }),
    description: msg({
      id: "deviceClassEditor.widget.parametersEditor.description",
      message: "Create and edit parameters for the device class",
    }),
    factory: () => <ParametersEditor />,
  },
  deviceInfoEditor: {
    name: msg({
      id: "deviceClassEditor.widget.deviceInfoEditor.name",
      message: "Device Info",
    }),
    description: msg({
      id: "deviceClassEditor.widget.deviceInfoEditor.description",
      message: "Edit basic device information",
    }),
    factory: () => <DeviceInfoEditor />,
  },
  dmxEditor: {
    name: msg({
      id: "deviceClassEditor.widget.dmxEditor.name",
      message: "DMX Footprint",
    }),
    description: msg({
      id: "deviceClassEditor.widget.dmxEditor.description",
      message: "Edit the DMX footprint of the device class",
    }),
    factory: () => <DmxEditor />,
  },
  dmxController: {
    name: msg({
      id: "deviceClassEditor.widget.dmxController.name",
      message: "Test DMX Controller",
    }),
    description: msg({
      id: "deviceClassEditor.widget.dmxController.description",
      message: "Test the device class with a virtual controller",
    }),
    factory: () => <DmxController />,
  },
  resourcesEditor: {
    name: msg({
      id: "deviceClassEditor.widget.resourcesEditor.name",
      message: "Resources",
    }),
    description: msg({
      id: "deviceClassEditor.widget.resourcesEditor.description",
      message: "Create and edit resources (e.g. assets) for the device class",
    }),
    factory: () => <ResourcesEditor />,
  },
  commandsEditor: {
    name: msg({
      id: "deviceClassEditor.widget.commandsEditor.name",
      message: "Commands",
    }),
    description: msg({
      id: "deviceClassEditor.widget.commandsEditor.description",
      message: "Create and edit commands for the device class",
    }),
    factory: () => <CommandsEditor />,
  },
  classesEditor: {
    name: msg({
      id: "deviceClassEditor.widget.classesEditor.name",
      message: "Classes",
    }),
    description: msg({
      id: "deviceClassEditor.widget.classesEditor.description",
      message: "Create and edit the item classes the device class defines",
    }),
    factory: () => (
      <DeviceClassClassEditing>
        <ClassesEditor />
      </DeviceClassClassEditing>
    ),
  },
};

export function isValidWidget(name: string): name is keyof typeof WIDGETS {
  return name in WIDGETS;
}
