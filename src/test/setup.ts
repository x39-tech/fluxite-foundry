import "@testing-library/jest-dom";
import { vi } from "vitest";
import { enablePatches } from "immer";
import Dexie from "dexie";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";

// Enable Immer patches for tests
enablePatches();

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
