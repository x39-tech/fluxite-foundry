import "@testing-library/jest-dom";
import { vi } from "vitest";
import { enablePatches } from "immer";
import Dexie from "dexie";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import { mockAnimationsApi } from "jsdom-testing-mocks";

// Mock animations API for Headless UI
mockAnimationsApi();

// Enable Immer patches for tests
enablePatches();

// Polyfill pointer capture APIs for Radix UI components (e.g., Select)
// happy-dom doesn't implement these, but Radix UI requires them
if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}
if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = function () {};
}
if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = function () {};
}

// Set up fake-indexeddb for Dexie before any tests run
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

// Mock the ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Stub the global ResizeObserver
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("zustand");

// Mock zustand middleware to avoid localStorage timing issues in CI
vi.mock("zustand/middleware", () => ({
  persist: vi.fn((config) => config), // Skip persistence in tests
  devtools: vi.fn((config) => config), // Skip devtools in tests
}));
