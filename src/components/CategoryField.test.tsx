import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocalizationDbSchema } from "app/persistentState";
import { buildCategoryCatalog, CategoryLocalizations } from "codex/categories";
import { CategoryField } from "./CategoryField";

function names(
  entries: Record<string, Record<string, string>>,
): CategoryLocalizations {
  return Object.fromEntries(
    Object.entries(entries).map(([category, strings]) => [
      category,
      { strings: LocalizationDbSchema.parse(strings) },
    ]),
  );
}

const catalog = buildCategoryCatalog([
  {
    libraryId: "org.esta.lib.intensity-color",
    parameterClassIds: [
      "color/additive/emitter",
      "color/cie-1931/xy/x",
      "intensity/dimmer",
      // Neither "shape" nor "shape/zoom" is localized anywhere below.
      "shape/zoom/focus",
    ],
    localizations: names({
      color: { "en-US": "Color", "en-GB": "Colour" },
      "color/additive": { "en-US": "Additive" },
      "color/cie-1931": { "en-US": "CIE-1931" },
      "color/cie-1931/xy": { "en-US": "CIE XY" },
      intensity: { "en-US": "Intensity" },
    }),
  },
]);

function renderField(
  props: Partial<React.ComponentProps<typeof CategoryField>> = {},
) {
  const onValueChange = props.onValueChange ?? vi.fn();

  render(
    <CategoryField
      value=""
      catalog={catalog}
      locale="en-US"
      onValueChange={onValueChange}
      {...props}
    />,
  );

  return { onValueChange };
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox"));
  return screen.getByPlaceholderText("Search categories...");
}

describe("CategoryField", () => {
  test("prompts for a category when none has been chosen", () => {
    renderField();

    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Select a category...",
    );
  });

  test("shows the chosen category as a localized path", () => {
    renderField({ value: "color/cie-1931/xy" });

    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Color › CIE-1931 › CIE XY",
    );
  });

  test("names a path segment with its identifier when it is not localized", () => {
    renderField({ value: "shape/zoom" });

    expect(screen.getByRole("combobox")).toHaveTextContent("shape › zoom");
  });

  test("shows the chosen category in the locale being edited", () => {
    renderField({ value: "color", locale: "en-GB" });

    expect(screen.getByRole("combobox")).toHaveTextContent("Colour");
  });

  test("offers every category under the heading of its root", async () => {
    const user = userEvent.setup();
    renderField();
    await openPicker(user);

    expect(
      screen.getByRole("option", { name: /Color › Additive/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Color" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Intensity" }),
    ).toBeInTheDocument();
  });

  test("finds a category by the name a user reads", async () => {
    const user = userEvent.setup();
    renderField();

    await user.type(await openPicker(user), "cie xy");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("color/cie-1931/xy");
  });

  test("finds a category by the identifier a file holds", async () => {
    const user = userEvent.setup();
    renderField();

    await user.type(await openPicker(user), "color/cie-1931/xy");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Color › CIE-1931 › CIE XY");
  });

  test("reports the category that was picked", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderField();

    await user.type(await openPicker(user), "additive");
    await user.click(screen.getByRole("option", { name: /Additive/ }));

    expect(onValueChange).toHaveBeenCalledWith("color/additive");
  });

  test("offers a category of the user's own, with a warning", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderField();

    await user.type(await openPicker(user), "beam/divergence");

    const option = screen.getByRole("option", {
      name: /Use "beam\/divergence" as a custom category/,
    });
    expect(screen.getByText(/reserves categories/)).toBeInTheDocument();

    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith("beam/divergence");
  });

  test("does not offer a custom category that duplicates a known one", async () => {
    const user = userEvent.setup();
    renderField();

    await user.type(await openPicker(user), "color/additive");

    expect(
      screen.queryByRole("option", { name: /as a custom category/ }),
    ).not.toBeInTheDocument();
  });

  test("says why a search cannot be a category of its own", async () => {
    const user = userEvent.setup();
    renderField();

    await user.type(await openPicker(user), "no spaces allowed");

    expect(
      screen.getByText("A category must not contain a space."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /as a custom category/ }),
    ).not.toBeInTheDocument();
  });

  test("marks a chosen category that no loaded library defines, and says why", async () => {
    const user = userEvent.setup();
    renderField({ value: "beam/divergence" });

    await user.hover(screen.getByLabelText("Unrecognized category"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      /reserves categories to published ESTA/,
    );
  });

  test("leaves a category the libraries do define unmarked", () => {
    renderField({ value: "color/additive" });

    expect(
      screen.queryByLabelText("Unrecognized category"),
    ).not.toBeInTheDocument();
  });
});
