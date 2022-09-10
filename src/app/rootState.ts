import { AppSettings } from "features/appSettings/appSettingsState";
import { FixtureEditorsState } from "features/fixtureEditor/fixtureEditorsState";

export interface RootState {
  appSettings: AppSettings;
  fixtureEditor: FixtureEditorsState;
}
