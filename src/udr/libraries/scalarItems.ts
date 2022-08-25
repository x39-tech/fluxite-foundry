import { goboScalarItems, goboScalarItemsByCategory } from "./gobo/scalarItems";
import {
  intensityColorScalarItems,
  intensityColorScalarItemsByCategory,
} from "./intensityColor/scalarItems";

export const allScalarItems = {
  "org.esta.lib.intensity-color.1": intensityColorScalarItems,
  "org.esta.lib.gobo.1": goboScalarItems,
};

export const allScalarItemsByCategory = {
  "org.esta.lib.intensity-color.1": intensityColorScalarItemsByCategory,
  "org.esta.lib.gobo.1": goboScalarItemsByCategory,
};
