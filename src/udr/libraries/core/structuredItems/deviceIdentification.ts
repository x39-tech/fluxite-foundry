import { DeviceCategory, DeviceSubcategory } from "../../../util/enums";

interface ManufacturerInfo {
  name: string;
  url?: string;
  estaId?: string;
}

interface ModelInfo {
  name: string;
  productIdentifier: string;
  category: DeviceCategory;
  subcategory: DeviceSubcategory;
}

interface CompatibilityInfo {
  firmwareVersions: Array<string>;
}

export interface DeviceIdentification {
  manufacturer: ManufacturerInfo;
  model: ModelInfo;
  compatibility?: CompatibilityInfo;
}
