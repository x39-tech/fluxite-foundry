import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagOptions, TagSelector } from "./TagSelector";

const FRUIT = ["apple", "apricot", "banana"];

function fruitOptions(query: string): TagOptions {
  const matches = FRUIT.filter((fruit) => fruit.includes(query.trim()));
  return { options: matches.map((value) => ({ value })) };
}

function renderSelector(
  props: Partial<React.ComponentProps<typeof TagSelector>> = {},
) {
  const onValuesChange = vi.fn();
  render(
    <TagSelector
      values={[]}
      search={fruitOptions}
      onValuesChange={onValuesChange}
      {...props}
    />,
  );
  return { onValuesChange, user: userEvent.setup() };
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add" }));
}

describe("TagSelector", () => {
  it("shows the chosen values as chips", () => {
    renderSelector({ values: ["apple", "banana"] });

    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getByText("banana")).toBeInTheDocument();
  });

  it("adds a value picked from the options", async () => {
    const { user, onValuesChange } = renderSelector({ values: ["apple"] });

    await openPicker(user);
    await user.click(screen.getByRole("option", { name: /banana/ }));

    expect(onValuesChange).toHaveBeenCalledWith(["apple", "banana"]);
  });

  it("removes a value picked again from the options", async () => {
    const { user, onValuesChange } = renderSelector({
      values: ["apple", "banana"],
    });

    await openPicker(user);
    await user.click(screen.getByRole("option", { name: /apple$/ }));

    expect(onValuesChange).toHaveBeenCalledWith(["banana"]);
  });

  it("removes a value from its chip", async () => {
    const { user, onValuesChange } = renderSelector({
      values: ["apple", "banana"],
    });

    await user.click(screen.getByRole("button", { name: "Remove apple" }));

    expect(onValuesChange).toHaveBeenCalledWith(["banana"]);
  });

  it("narrows the options to what the search offers", async () => {
    const { user } = renderSelector();

    await openPicker(user);
    await user.type(screen.getByPlaceholderText("Search..."), "ap");

    expect(screen.getByRole("option", { name: /apple/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /banana/ })).toBeNull();
  });

  it("offers no way to enter a value that is not on offer", async () => {
    const { user, onValuesChange } = renderSelector();

    await openPicker(user);
    const searchBox = screen.getByPlaceholderText("Search...");
    await user.type(searchBox, "durian{Enter}");

    expect(onValuesChange).not.toHaveBeenCalled();
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });

  it("explains an invalid value and still lets it be removed", async () => {
    const { user, onValuesChange } = renderSelector({
      values: ["apple", "durian"],
      validate: (value) =>
        value === "durian" ? "Not a permitted fruit." : undefined,
    });

    expect(
      screen.getByRole("button", { name: "durian: Not a permitted fruit." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^apple:/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Remove durian" }));
    expect(onValuesChange).toHaveBeenCalledWith(["apple"]);
  });

  it("reopens showing everything rather than the last search", async () => {
    const { user } = renderSelector();

    await openPicker(user);
    await user.type(screen.getByPlaceholderText("Search..."), "ap");
    expect(screen.queryByRole("option", { name: /banana/ })).toBeNull();

    await user.keyboard("{Escape}");
    await openPicker(user);

    expect(screen.getByPlaceholderText("Search...")).toHaveValue("");
    expect(screen.getByRole("option", { name: /banana/ })).toBeInTheDocument();
  });

  it("groups options under their headings", async () => {
    const { user } = renderSelector({
      search: () => ({
        options: [
          { value: "apple", group: "pome" },
          { value: "apricot", group: "stone" },
        ],
        note: "Showing 2 of 200 fruits.",
      }),
    });

    await openPicker(user);

    expect(screen.getByText("pome")).toBeInTheDocument();
    expect(screen.getByText("stone")).toBeInTheDocument();
    expect(screen.getByText("Showing 2 of 200 fruits.")).toBeInTheDocument();
  });
});
