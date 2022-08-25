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

  // TODO: document needs addition of these
  RPM = "rpm",
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
  // TODO add rest of lighting subcategories
  MEDIA_SERVER = "media-server",
  // TODO add rest of video subcategories
  AMPLIFIER = "amplifier",
  // TODO add rest of audio subcategories
  WINCH = "winch",
  // TODO add rest of machinery-automation subcategories
  SMOKE = "smoke",
  // TODO add rest of atmosphere subcategories
  PYRO = "pyro",
  // TODO add rest of effect subcategories
  NETWORK_SWITCH = "network-switch",
  // TODO add rest of infrastructure subcategories
  CONTROLLER = "controller",
  // TODO add rest of other subcategories
}

export const deviceSubCategoryMap: {
  [key in DeviceCategory]: Array<DeviceSubCategory>;
} = {
  [DeviceCategory.LIGHTING]: [
    DeviceSubCategory.FIXED_PROFILE,
    DeviceSubCategory.MOVING_PROFILE,
  ],
  [DeviceCategory.VIDEO]: [DeviceSubCategory.MEDIA_SERVER],
  [DeviceCategory.AUDIO]: [DeviceSubCategory.AMPLIFIER],
  [DeviceCategory.MACHINERY_AUTOMATION]: [DeviceSubCategory.WINCH],
  [DeviceCategory.ATMOSPHERE]: [DeviceSubCategory.SMOKE],
  [DeviceCategory.EFFECT]: [DeviceSubCategory.PYRO],
  [DeviceCategory.INFRASTRUCTURE]: [DeviceSubCategory.NETWORK_SWITCH],
  [DeviceCategory.OTHER]: [DeviceSubCategory.CONTROLLER],
};
