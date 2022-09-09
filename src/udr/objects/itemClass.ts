import { DataType, FileType, Unit } from "../util/enums";

export interface ItemClass {
  identifier: string;
  name: string;
  category: string;
  description: string;
}

export interface BulkItemClass extends ItemClass {
  fileType: FileType;
  fileFormat: string;
}

export interface ScalarItemClass extends ItemClass {
  dataType: DataType;
  unit?: Unit;
  default?: number | string | boolean;
  inherits?: string;
}

export interface StreamingStructuredItemClass extends ItemClass {}

export interface StructuredItemClass extends ItemClass {}
