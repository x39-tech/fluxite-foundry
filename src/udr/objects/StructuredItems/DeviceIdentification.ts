import { DeviceCategory, DeviceSubCategory } from "../../util/enums";

interface ManufacturerInfo {
  name: string;
  url?: string;
  estaId?: string;
}

interface ModelInfo {
  name: string;
  productIdentifier: string;
  category: DeviceCategory;
  subcategory: DeviceSubCategory;
}

interface CompatibilityInfo {
  firmwareVersions: Array<string>;
}

export interface DeviceIdentification {
  manufacturer: ManufacturerInfo;
  model: ModelInfo;
  compatibility?: CompatibilityInfo;
}
