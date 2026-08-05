// The structure, serializer and resource class editors, which differ from each
// other only in the handful of fields beyond ID, name and description.

import { describe, test, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CodexId,
  EntityId,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { DeviceClassClassEditing } from "features/deviceClassEditor/classEditing";
import { StructureClassEditor } from "./StructureClassEditor";
import { SerializerClassEditor } from "./SerializerClassEditor";
import { ResourceClassEditor } from "./ResourceClassEditor";

const CLASS_ID = EntityId("test-class");
const NAME_KEY = LocalizationKey("test-class-name");

function withName(draft: { localizations: Record<string, unknown> }) {
  draft.localizations[NAME_KEY] = {
    strings: LocalizationDbSchema.parse({ "en-US": "Test Class" }),
  };
  return { name: NAME_KEY };
}

function renderInEditor(children: React.ReactNode) {
  return render(<DeviceClassClassEditing>{children}</DeviceClassClassEditing>);
}

describe("StructureClassEditor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    updateCurrentEditor("Add test structure class", (draft) => {
      draft.structureClasses[CLASS_ID] = {
        codexId: CodexId("emitters"),
        localized: withName(draft),
      };
    });
  });

  test("toggles whether multiple are allowed", async () => {
    const user = userEvent.setup();
    renderInEditor(<StructureClassEditor id={CLASS_ID} />);

    const checkbox = screen.getByRole("checkbox", { name: "Multiple Allowed" });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(
      screen.getByRole("checkbox", { name: "Multiple Allowed" }),
    ).toBeChecked();

    await user.click(
      screen.getByRole("checkbox", { name: "Multiple Allowed" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Multiple Allowed" }),
    ).not.toBeChecked();
  });
});

describe("SerializerClassEditor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    updateCurrentEditor("Add test serializer class", (draft) => {
      draft.serializerClasses[CLASS_ID] = {
        codexId: CodexId("esta-dmx"),
        localized: withName(draft),
      };
    });
  });

  test("edits the description, which starts empty", async () => {
    const user = userEvent.setup();
    renderInEditor(<SerializerClassEditor id={CLASS_ID} />);

    const description = screen.getByRole("textbox", { name: "Description" });
    expect(description).toHaveValue("");

    await user.type(description, "The ESTA DMX serializer{Enter}");

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "The ESTA DMX serializer",
    );
  });
});

describe("ResourceClassEditor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    updateCurrentEditor("Add test resource class", (draft) => {
      draft.resourceClasses[CLASS_ID] = {
        codexId: CodexId("gobo"),
        mediaType: [],
        localized: withName(draft),
      };
    });
  });

  test("collects media types as tags", async () => {
    const user = userEvent.setup();
    renderInEditor(<ResourceClassEditor id={CLASS_ID} />);

    const input = screen.getByPlaceholderText("e.g. image/png");
    await user.type(input, "image/png{Enter}");
    await user.type(input, "image/svg+xml{Enter}");

    expect(screen.getByText("image/png")).toBeInTheDocument();
    expect(screen.getByText("image/svg+xml")).toBeInTheDocument();
  });
});
