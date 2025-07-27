import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders with left icon when provided", () => {
    render(<Button icon="HomeIcon">Home</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("renders with right icon when provided", () => {
    render(<Button rightIcon="ChevronRightIcon">Next</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("renders with both left and right icons", () => {
    render(
      <Button icon="HomeIcon" rightIcon="ChevronRightIcon">
        Home
      </Button>,
    );
    const button = screen.getByRole("button");
    const icons = button.querySelectorAll("svg");
    expect(icons).toHaveLength(2);
  });

  it("renders children in correct order after icon", () => {
    render(<Button icon="HomeIcon">Label</Button>);
    const button = screen.getByRole("button");
    const buttonContent = button.textContent;
    expect(buttonContent).toBe("Label");

    const svg = button.querySelector("svg");
    const textNode = Array.from(button.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );

    if (svg && textNode) {
      expect(button.childNodes[0]).toBe(svg);
      expect(Array.from(button.childNodes).indexOf(textNode)).toBeGreaterThan(
        0,
      );
    }
  });

  it("renders with correct icon iconSize classes", () => {
    const { rerender } = render(<Button icon="HomeIcon" iconSize={3} />);
    let icon = screen.getByRole("button").querySelector("svg");
    expect(icon).toHaveClass("size-3");

    rerender(<Button icon="HomeIcon" iconSize={4} />);
    icon = screen.getByRole("button").querySelector("svg");
    expect(icon).toHaveClass("size-4");

    rerender(<Button icon="HomeIcon" iconSize={5} />);
    icon = screen.getByRole("button").querySelector("svg");
    expect(icon).toHaveClass("size-5");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>,
    );

    await user.click(screen.getByText("Click me"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled button</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Styled button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("applies aria-label when provided", () => {
    render(<Button aria-label="Close dialog">×</Button>);
    const button = screen.getByLabelText("Close dialog");
    expect(button).toBeInTheDocument();
  });

  it("removes hover styling when active is provided", () => {
    // Test with active={true}
    const { rerender } = render(<Button active={true}>Active True</Button>);
    let button = screen.getByRole("button");
    let classes = button.className.split(" ");
    let hoverClasses = classes.filter((cls) => cls.startsWith("hover:"));
    expect(hoverClasses).toHaveLength(0);

    // Test with active={false}
    rerender(<Button active={false}>Active False</Button>);
    button = screen.getByRole("button");
    classes = button.className.split(" ");
    hoverClasses = classes.filter((cls) => cls.startsWith("hover:"));
    expect(hoverClasses).toHaveLength(0);
  });

  it("renders without icons when no icon props provided", () => {
    render(<Button>Text only</Button>);
    const button = screen.getByRole("button");
    expect(button.querySelector("svg")).not.toBeInTheDocument();
  });
});
