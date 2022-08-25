import {
  BulkItemClass,
  ScalarItemClass,
  StreamingStructuredItemClass,
  StructuredItemClass,
} from "./itemClass";

export interface Library {
  id: string;
  description: string;
  publishDate: string;
  author: string;
  scalarItemClasses: Array<ScalarItemClass>;
  structuredItemClasses: Array<StructuredItemClass>;
  streamingStructuredItemClasses: Array<StreamingStructuredItemClass>;
  bulkItemClasses: Array<BulkItemClass>;
  // TODO: localizations
}
