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

    await user.type(description, "The ESTA DMX serializer");
    await user.tab();

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "The ESTA DMX serializer",
    );
  });

  test("accepts a description spanning several lines", async () => {
    const user = userEvent.setup();
    renderInEditor(<SerializerClassEditor id={CLASS_ID} />);

    await user.type(
      screen.getByRole("textbox", { name: "Description" }),
      "The ESTA DMX serializer.{Enter}Defined by E1.11.",
    );
    await user.tab();

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "The ESTA DMX serializer.\nDefined by E1.11.",
    );
  });

  test("abandons an in-progress description edit on Escape", async () => {
    const user = userEvent.setup();
    renderInEditor(<SerializerClassEditor id={CLASS_ID} />);

    const description = screen.getByRole("textbox", { name: "Description" });
    await user.type(description, "The ESTA DMX serializer");
    await user.tab();

    await user.type(
      screen.getByRole("textbox", { name: "Description" }),
      " (revised){Escape}",
    );

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "The ESTA DMX serializer",
    );
  });
});

describe("ResourceClassEditor", () => {
  function addResourceClass(mediaType: string[]) {
    updateCurrentEditor("Add test resource class", (draft) => {
      draft.resourceClasses[CLASS_ID] = {
        codexId: CodexId("gobo"),
        mediaType,
        localized: withName(draft),
      };
    });
  }

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  async function openMediaTypePicker() {
    const user = userEvent.setup();
    renderInEditor(<ResourceClassEditor id={CLASS_ID} />);
    await user.click(screen.getByRole("button", { name: "Add media type" }));
    return user;
  }

  test("collects media types picked from the IANA registry", async () => {
    addResourceClass([]);
    const user = await openMediaTypePicker();

    const search = screen.getByPlaceholderText("Search media types...");
    await user.type(search, "image/png");
    await user.click(screen.getByRole("option", { name: /image\/png/ }));

    await user.clear(search);
    await user.type(search, "image/svg");
    await user.click(screen.getByRole("option", { name: /image\/svg\+xml/ }));

    // Only a chosen media type gets a chip, and only a chip has a remove
    // button, so this distinguishes the chips from the still-open picker.
    expect(
      screen.getByRole("button", { name: "Remove image/png" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove image/svg+xml" }),
    ).toBeInTheDocument();
  });

  test("offers nothing for a media type the registry does not list", async () => {
    addResourceClass([]);
    const user = await openMediaTypePicker();

    await user.type(
      screen.getByPlaceholderText("Search media types..."),
      "image/jpg{Enter}",
    );

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(
      screen.getByText("No registered media type matches."),
    ).toBeInTheDocument();
    expect(screen.queryByText("image/jpg")).toBeNull();
  });

  test("keeps an unregistered media type from an imported document, flagged", () => {
    addResourceClass(["image/png", "image/jpg"]);
    renderInEditor(<ResourceClassEditor id={CLASS_ID} />);

    expect(screen.getByText("image/jpg")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^image\/jpg: Not registered/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 media type is not in the IANA registry/),
    ).toBeInTheDocument();
  });

  test("says nothing about the registry when every media type is registered", () => {
    addResourceClass(["image/png"]);
    renderInEditor(<ResourceClassEditor id={CLASS_ID} />);

    expect(screen.queryByText(/not in the IANA registry/)).toBeNull();
  });

  test("lets an unregistered media type be removed", async () => {
    const user = userEvent.setup();
    addResourceClass(["image/png", "image/jpg"]);
    renderInEditor(<ResourceClassEditor id={CLASS_ID} />);

    await user.click(screen.getByRole("button", { name: "Remove image/jpg" }));

    expect(screen.queryByText("image/jpg")).toBeNull();
    expect(screen.getByText("image/png")).toBeInTheDocument();
    expect(screen.queryByText(/not in the IANA registry/)).toBeNull();
  });
});
