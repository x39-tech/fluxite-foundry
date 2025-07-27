import "@testing-library/jest-dom";
import { vi } from "vitest";
import { enablePatches } from "immer";

// Enable Immer patches for tests
enablePatches();

// Mock the ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Stub the global ResizeObserver
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("zustand");
