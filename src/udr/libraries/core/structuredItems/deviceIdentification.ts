import { StructuredItem } from "udr/objects/item";
import {
  Access,
  DeviceCategory,
  DeviceSubcategory,
  Lifetime,
  LightingDeviceSubcategory,
} from "../../../util/enums";

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

export const DEVICE_IDENTIFICATION_CLASS =
  "org.esta.lib.core.1/device-identification";

export function getDefaultDeviceIdentification(): StructuredItem {
  return {
    class: DEVICE_IDENTIFICATION_CLASS,
    access: Access.READONLY,
    lifetime: Lifetime.STATIC,
    default: {
      manufacturer: {
        name: "ACME Inc.",
      },
      model: {
        name: "Super Light",
        productIdentifier: "superlight",
        category: DeviceCategory.LIGHTING,
        subcategory: LightingDeviceSubcategory.MOVING_PROFILE,
      },
    },
  };
}
