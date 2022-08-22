export enum Access {
  READONLY = "readonly",
  READWRITE = "readwrite",
}

export enum Lifetime {
  STATIC = "static",
  PERSISTENT = "persistent",
  RUNTIME = "runtime",
}

export enum DataType {
  NUMBER = "number",
  STRING = "string",
  BINARY = "binary",
  BOOLEAN = "boolean",
  UUID = "uuid",
}

export enum Unit {
  DEGREE_CELSIUS = "degree-celsius",
  DEGREE_FAHRENHEIT = "degree-fahrenheit",
  KELVIN = "kelvin",
  VOLT_DC = "volt-dc",
  VOLT_AC_PEAK = "volt-ac-peak",
  VOLT_AC_RMS = "volt-ac-rms",
  AMP_DC = "amp-dc",
  AMP_AC_PEAK = "amp-ac-peak",
  AMP_AC_RMS = "amp-ac-rms",
  HERTZ = "hertz",
  OHM = "ohm",
  WATT = "watt",
  KILOGRAM = "kilogram",
  METER = "meter",
  SQUARE_METER = "square-meter",
  CUBIC_METER = "cubic-meter",
  METER_PER_SECOND = "meter-per-second",
  METER_PER_SECOND_SQUARED = "meter-per-second-squared",
  NEWTON = "newton",
  JOULE = "joule",
  PASCAL = "pascal",
  SECOND = "second",
  DEGREE = "degree",
  STERADIAN = "steradian",
  CANDELA = "candela",
  LUMEN = "lumen",
  LUX = "lux",
  IRE = "ire",
  BYTE = "byte",
  PERCENT = "percent",
  UNITLESS = "unitless",
}

export enum FileType {
  MOVIE = "movie",
  VIDEO = "video",
  IMAGE = "image",
  AUDIO = "audio",
  THREEDMODEL = "3dmodel",
  SYMBOL = "symbol",
  OTHER = "other",
}

export enum DeviceCategory {
  LIGHTING = "lighting",
  VIDEO = "video",
  AUDIO = "audio",
  MACHINERY_AUTOMATION = "machinery-automation",
  ATMOSPHERE = "atmosphere",
  EFFECT = "effect",
  INFRASTRUCTURE = "infrastructure",
  OTHER = "other",
}

export enum DeviceSubCategory {
  FIXED_PROFILE = "fixed-profile",
  MOVING_PROFILE = "moving-profile",
  // TODO add all
}

export const deviceSubCategoryMap: {
  [key in DeviceCategory]: Array<DeviceSubCategory>;
} = {
  [DeviceCategory.LIGHTING]: [
    DeviceSubCategory.FIXED_PROFILE,
    DeviceSubCategory.MOVING_PROFILE,
  ],
  [DeviceCategory.VIDEO]: [],
  [DeviceCategory.AUDIO]: [],
  [DeviceCategory.MACHINERY_AUTOMATION]: [],
  [DeviceCategory.ATMOSPHERE]: [],
  [DeviceCategory.EFFECT]: [],
  [DeviceCategory.INFRASTRUCTURE]: [],
  [DeviceCategory.OTHER]: [],
};
