import { AppSettings } from "features/appSettings/appSettingsState";
import { DeviceClassEditorsState } from "features/deviceClassEditor/deviceClassEditorsState";

export interface RootState {
  appSettings: AppSettings;
  editors: DeviceClassEditorsState;
}
