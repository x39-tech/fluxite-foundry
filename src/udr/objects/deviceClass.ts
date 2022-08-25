import {
  BulkItem,
  ScalarItem,
  StreamingStructuredItem,
  StructuredItem,
} from "./item";
import { Library } from "./library";

export interface DeviceClass {
  description: string;
  publishDate: string;
  author: string;
  history: Record<string, string>;
  deviceLibrary?: Library;
  scalarItems?: Record<string, ScalarItem>;
  structuredItems?: {
    [key: string]: StructuredItem;
  };
  streamingStructuredItems?: Record<string, StreamingStructuredItem>;
  bulkItems?: Record<string, BulkItem>;
  // localization
}
