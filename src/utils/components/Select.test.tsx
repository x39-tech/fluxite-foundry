import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectOption } from "./Select";

describe("Select", () => {
  const options = (
    <>
      <option value="option1">Option 1</option>
      <option value="option2">Option 2</option>
      <option value="option3">Option 3</option>
    </>
  );

  it("renders with options", () => {
    render(<Select>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Option 3")).toBeInTheDocument();
  });

  it("renders with chevron down icon", () => {
    render(<Select>{options}</Select>);
    const container = screen.getByRole("combobox").parentElement;
    const icon = container?.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("calls onChange when option is selected", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Select onChange={handleChange} defaultValue="option1">
        {options}
      </Select>,
    );

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "option2");

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(expect.any(Object));

    const call = handleChange.mock.calls[0][0];
    expect(call.target.value).toBe("option2");
  });

  it("displays correct selected value", () => {
    render(
      <Select value="option2" onChange={() => {}}>
        {options}
      </Select>,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("option2");
  });

  it("applies custom className", () => {
    render(<Select className="custom-class">{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select.parentElement).toHaveClass("custom-class");
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<Select disabled>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Select onChange={handleChange} disabled value="option1">
        {options}
      </Select>,
    );

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "option2");

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("renders with large sizing when large prop is true", () => {
    render(<Select large>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("px-3", "py-2", "text-base", "pr-10");

    const container = select.parentElement;
    const icon = container?.querySelector("svg");
    expect(icon).toHaveClass("size-5");
  });

  it("renders with default sizing when large prop is false", () => {
    render(<Select>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("px-2", "py-1", "text-sm", "pr-8");

    const container = select.parentElement;
    const icon = container?.querySelector("svg");
    expect(icon).toHaveClass("size-4");
  });

  it("renders with full width when fill prop is true", () => {
    render(<Select fill>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select.parentElement).toHaveClass("w-full");
  });

  it("renders with inline-block width when fill prop is false", () => {
    render(<Select>{options}</Select>);
    const select = screen.getByRole("combobox");
    const container = select.parentElement;

    expect(container).not.toHaveClass("w-full");
    expect(container).toHaveClass("inline-block");
  });

  it("forwards ref to select element", () => {
    const ref = vi.fn();
    render(<Select ref={ref}>{options}</Select>);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLSelectElement));
  });

  describe("options prop", () => {
    it("renders options from string array", () => {
      const stringOptions = ["Option 1", "Option 2", "Option 3"];
      render(<Select options={stringOptions} />);

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("renders options from SelectOption array with labels", () => {
      const objectOptions: SelectOption[] = [
        { value: "opt1", label: "First Option" },
        { value: "opt2", label: "Second Option" },
        { value: "opt3", label: "Third Option" },
      ];
      render(<Select options={objectOptions} />);

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(screen.getByText("First Option")).toBeInTheDocument();
      expect(screen.getByText("Second Option")).toBeInTheDocument();
      expect(screen.getByText("Third Option")).toBeInTheDocument();

      // Check that values are set correctly
      const option1 = screen.getByText("First Option") as HTMLOptionElement;
      expect(option1.value).toBe("opt1");
    });

    it("renders options from SelectOption array without labels (uses value as label)", () => {
      const objectOptions: SelectOption[] = [
        { value: "option1" },
        { value: "option2" },
        { value: "option3" },
      ];
      render(<Select options={objectOptions} />);

      expect(screen.getByText("option1")).toBeInTheDocument();
      expect(screen.getByText("option2")).toBeInTheDocument();
      expect(screen.getByText("option3")).toBeInTheDocument();
    });

    it("prefers children over options prop when both are provided", () => {
      const stringOptions = ["Should not appear"];
      render(
        <Select options={stringOptions}>
          <option value="child1">Child Option 1</option>
          <option value="child2">Child Option 2</option>
        </Select>,
      );

      expect(screen.getByText("Child Option 1")).toBeInTheDocument();
      expect(screen.getByText("Child Option 2")).toBeInTheDocument();
      expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
    });

    it("works with onChange using string array options", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const stringOptions = ["option1", "option2", "option3"];

      render(
        <Select
          options={stringOptions}
          onChange={handleChange}
          defaultValue="option1"
        />,
      );

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "option2");

      expect(handleChange).toHaveBeenCalledTimes(1);
      const call = handleChange.mock.calls[0][0];
      expect(call.target.value).toBe("option2");
    });

    it("works with onChange using SelectOption array", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const objectOptions: SelectOption[] = [
        { value: "opt1", label: "First" },
        { value: "opt2", label: "Second" },
        { value: "opt3", label: "Third" },
      ];

      render(
        <Select
          options={objectOptions}
          onChange={handleChange}
          defaultValue="opt1"
        />,
      );

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "opt2");

      expect(handleChange).toHaveBeenCalledTimes(1);
      const call = handleChange.mock.calls[0][0];
      expect(call.target.value).toBe("opt2");
    });
  });
});
