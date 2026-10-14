import { render, screen } from "test/render";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { mockElementWidth } from "test/utils";
import {
  SidebarLayout,
  SidebarLayoutMain,
  SidebarLayoutSidebar,
  SidebarLayoutTrigger,
  useSidebarLayout,
} from "./SidebarLayout";

const PickButton = () => {
  const { close } = useSidebarLayout();
  return <button onClick={close}>Pick</button>;
};

function renderSidebarLayout({ customTrigger = false } = {}) {
  return render(
    <SidebarLayout collapseBelow={600}>
      <SidebarLayoutSidebar>
        <div>Sidebar content</div>
        <PickButton />
      </SidebarLayoutSidebar>
      <SidebarLayoutMain>
        {customTrigger && <SidebarLayoutTrigger />}
        <div>Main content</div>
      </SidebarLayoutMain>
    </SidebarLayout>,
  );
}

async function openDrawer() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Show sidebar" }));
  return user;
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("shows the sidebar beside the main content when wide", () => {
  mockElementWidth(800);
  renderSidebarLayout();

  expect(screen.getByText("Sidebar content")).toBeInTheDocument();
  expect(screen.getByText("Main content")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Show sidebar" }),
  ).not.toBeInTheDocument();
});

test("collapses the sidebar when narrow and shows it on demand", async () => {
  mockElementWidth(500);
  renderSidebarLayout();

  expect(screen.queryByText("Sidebar content")).not.toBeInTheDocument();
  expect(screen.getByText("Main content")).toBeInTheDocument();

  await openDrawer();

  expect(screen.getByRole("dialog", { name: "Sidebar" })).toHaveTextContent(
    "Sidebar content",
  );
});

test("hides the drawer from its close button", async () => {
  mockElementWidth(500);
  renderSidebarLayout();

  const user = await openDrawer();
  await user.click(screen.getByRole("button", { name: "Hide sidebar" }));

  expect(screen.queryByText("Sidebar content")).not.toBeInTheDocument();
});

test("hides the drawer on Escape", async () => {
  mockElementWidth(500);
  renderSidebarLayout();

  const user = await openDrawer();
  await user.keyboard("{Escape}");

  expect(screen.queryByText("Sidebar content")).not.toBeInTheDocument();
});

test("hides the drawer when the main content is clicked", async () => {
  mockElementWidth(500);
  renderSidebarLayout();

  const user = await openDrawer();
  await user.click(screen.getByText("Main content"));

  expect(screen.queryByText("Sidebar content")).not.toBeInTheDocument();
});

test("lets the sidebar's content hide the drawer", async () => {
  mockElementWidth(500);
  renderSidebarLayout();

  const user = await openDrawer();
  await user.click(screen.getByRole("button", { name: "Pick" }));

  expect(screen.queryByText("Sidebar content")).not.toBeInTheDocument();
});

test("shows the sidebar inline again once the layout widens", async () => {
  const resizeTo = mockElementWidth(500);
  renderSidebarLayout();

  await openDrawer();
  resizeTo(800);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Sidebar content")).toBeInTheDocument();

  // The drawer stays closed when the layout narrows again.
  resizeTo(500);

  expect(screen.queryByText("Sidebar content")).not.toBeInTheDocument();
});

test("keeps its layout while hidden and measuring zero wide", () => {
  const resizeTo = mockElementWidth(800);
  renderSidebarLayout();

  resizeTo(0);

  expect(screen.getByText("Sidebar content")).toBeInTheDocument();
});

test("uses a trigger placed in the content instead of the default", async () => {
  mockElementWidth(500);
  renderSidebarLayout({ customTrigger: true });

  expect(screen.getAllByRole("button", { name: "Show sidebar" })).toHaveLength(
    1,
  );

  await openDrawer();

  expect(screen.getByText("Sidebar content")).toBeInTheDocument();
});
