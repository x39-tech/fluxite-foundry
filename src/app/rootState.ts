import { AppSettings } from "features/topNavBar/appSettingsState";
import { DeviceClassEditorsState } from "features/deviceClassEditor/deviceClassEditorsState";

export interface RootState {
  appSettings: AppSettings;
  editors: DeviceClassEditorsState;
}
