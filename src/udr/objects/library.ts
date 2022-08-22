import {
  BulkItemClass,
  ScalarItemClass,
  StreamingStructuredItemClass,
  StructuredItemClass,
} from "./item_class";

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
