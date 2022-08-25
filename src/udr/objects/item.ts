import { Access, Lifetime } from "../util/enums";
import { DeviceIdentification } from "../libraries/core/structuredItems/deviceIdentification";

export type StructuredItemValue = DeviceIdentification;

export interface ScalarItem {
  class: string;
  friendlyName?: string;
  dynamicMinimum?: number;
  dynamicMaximum?: number;
  count?: number;
  access: Access;
  lifetime: Lifetime;
  atomicIdentifier?: string;
  minimum?: number;
  maximum?: number;
  minimumScalarItem?: string;
  maximumScalarItem?: string;
  default?: number;
  wrapping?: boolean;
}

export interface StructuredItem {
  class: string;
  access: Access;
  lifetime: Lifetime;
  default?: StructuredItemValue;
}

export interface StreamingStructuredItem {
  class: string;
  access: Access;
  lifetime: Lifetime;
  default?: Record<string | number, any>;
}

export interface BulkItem {
  class: string;
  access: Access;
  lifetime: Lifetime;
}
