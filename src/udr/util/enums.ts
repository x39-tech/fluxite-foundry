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

export enum LightingDeviceSubcategory {
  FIXED_PROFILE = "fixed-profile",
  FIXED_FRESNEL = "fixed-fresnel",
  FIXED_PC = "fixed-pc",
  FIXED_WASH = "fixed-wash",
  FIXED_STRIP = "fixed-strip",
  MOVING_PROFILE = "moving-profile",
  MOVING_FRESNEL = "moving-fresnel",
  MOVING_PC = "moving-pc",
  MOVING_WASH = "moving-wash",
  MOVING_STRIP = "moving-strip",
  MOVING_MIRROR = "moving-mirror",
  ACCESSORY_SCROLLER = "accessory-scroller",
  ACCESSORY_GOBO_ROTATOR = "accessory-gobo-rotator",
  ACCESSORY_ANIMATION = "accessory-animation",
  ACCESSORY_IRIS = "accessory-iris",
  ACCESSORY_OTHER = "accessory-other",
  CONTROLLER = "controller",
  OTHER = "other",
}

export enum VideoDeviceSubcategory {
  MEDIA_SERVER = "media-server",
  PROJECTOR = "projector",
  PANEL = "panel",
  CAMERA = "camera",
  CONTROLLER = "controller",
  OTHER = "other",
}

export enum AudioDeviceSubcategory {
  AMPLIFIER = "amplifier",
  SPEAKER = "speaker",
  CONTROLLER = "controller",
  OTHER = "other",
}

export enum MachineryAutomationDeviceSubcategory {
  WINCH = "winch",
  HOIST = "hoist",
  DRIVE = "drive",
  REVOLVE = "revolve",
  LOAD_CELL = "load-cell",
  ESTOP = "estop",
  CONTROLLER = "controller",
  OTHER = "other",
}

export enum AtmosphereDeviceSubcategory {
  SMOKE = "smoke",
  HAZE = "haze",
  CONTROLLER = "controller",
  OTHER = "other",
}

export enum EffectDeviceSubcategory {
  PYRO = "pyro",
  FIRE = "fire",
  STROBE = "strobe",
  LASER = "laser",
  WATER = "water",
  SNOW = "snow",
  BUBBLE = "bubble",
  FAN = "fan",
  CONTROLLER = "controller",
  OTHER = "other",
}

export enum InfrastructureDeviceSubcategory {
  NETWORK_SWITCH = "network-switch",
  GATEWAY = "gateway",
  SPLITTER = "splitter",
}

export enum OtherDeviceSubcategory {
  CONTROLLER = "controller",
  OTHER = "other",
}

export type DeviceSubcategory =
  | LightingDeviceSubcategory
  | VideoDeviceSubcategory
  | AudioDeviceSubcategory
  | MachineryAutomationDeviceSubcategory
  | AtmosphereDeviceSubcategory
  | EffectDeviceSubcategory
  | InfrastructureDeviceSubcategory
  | OtherDeviceSubcategory;

export const deviceSubCategoryMap: {
  [key in DeviceCategory]: Array<DeviceSubcategory>;
} = {
  [DeviceCategory.LIGHTING]: Object.values(LightingDeviceSubcategory),
  [DeviceCategory.VIDEO]: Object.values(VideoDeviceSubcategory),
  [DeviceCategory.AUDIO]: Object.values(AudioDeviceSubcategory),
  [DeviceCategory.MACHINERY_AUTOMATION]: Object.values(
    MachineryAutomationDeviceSubcategory
  ),
  [DeviceCategory.ATMOSPHERE]: Object.values(AtmosphereDeviceSubcategory),
  [DeviceCategory.EFFECT]: Object.values(EffectDeviceSubcategory),
  [DeviceCategory.INFRASTRUCTURE]: Object.values(
    InfrastructureDeviceSubcategory
  ),
  [DeviceCategory.OTHER]: Object.values(OtherDeviceSubcategory),
};
