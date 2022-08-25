import App from "app/App";
import { loadAppSettings, defaultAppSettings } from "./appSettings";

describe("app settings API", () => {
  it("loads default settings when they are not present in storage", () => {
    expect(loadAppSettings()).toEqual(defaultAppSettings());
  });

  it("loads default settings when the storage is not valid JSON", () => {
    localStorage.setItem("settings", "foo");
    expect(loadAppSettings()).toEqual(defaultAppSettings());
  });

  it("loads non-default settings", () => {
    localStorage.setItem(
      "settings",
      '{"darkMode":true,"threeDViewEnabled":true}'
    );
    const settings = loadAppSettings();
    expect(settings.darkMode).toBe(true);
    expect(settings.threeDViewEnabled).toBe(true);
  });

  it("adds settings that are not present with their default values", () => {
    localStorage.setItem("settings", '{"darkMode":false}');
    expect(loadAppSettings()).toEqual(defaultAppSettings());
  });

  it("replaces settings that are not the correct type with their default value", () => {
    localStorage.setItem(
      "settings",
      '{"darkMode": "foo","threeDViewEnabled":true}'
    );
    const settings = loadAppSettings();
    expect(settings.darkMode).toBe(false);
    expect(settings.threeDViewEnabled).toBe(true);
  });
});
