import { DataType, FileType, Unit } from "../util/enums";

export interface BulkItemClass {
  identifier: string;
  name: string;
  category: string;
  description: string;
  fileType: FileType;
  fileFormat: string;
}

export interface ScalarItemClass {
  identifier: string;
  name: string;
  category: string;
  description: string;
  dataType: DataType;
  unit?: Unit;
  default?: number | string | boolean;
  inherits?: string;
}

export interface StreamingStructuredItemClass {
  identifier: string;
  name: string;
  category: string;
  description: string;
}

export interface StructuredItemClass {
  identifier: string;
  name: string;
  category: string;
  description: string;
}
