import "@testing-library/jest-dom";
import { vi } from "vitest";

import { Blob } from "buffer";
globalThis.Blob = Blob as unknown as typeof globalThis.Blob; // use Node.js Blob instead of Jsdom's Blob

// Mock the ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Stub the global ResizeObserver
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("zustand");
