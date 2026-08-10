import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { setTheme, useTheme } from "app/store";
import {
  AVAILABLE_UI_LOCALES,
  setUiLocale,
  uiLocaleName,
  useUiLocale,
  UiLocale,
} from "app/i18n";
import { Theme } from "app/persistentState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "components/scn-ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { Label } from "components/scn-ui/Label";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const themeOptions: { value: Theme; label: MessageDescriptor }[] = [
  {
    value: "light",
    label: msg({ id: "settings.theme.light", message: "Light" }),
  },
  { value: "dark", label: msg({ id: "settings.theme.dark", message: "Dark" }) },
  {
    value: "system",
    label: msg({ id: "settings.theme.system", message: "System" }),
  },
];

/** Lets the user pick the language to display the app in. */
const LanguageSetting = () => {
  const locale = useUiLocale();

  if (AVAILABLE_UI_LOCALES.length < 2) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="language-select">
        <Trans id="settings.language.label">Language</Trans>
      </Label>
      <Select
        value={locale}
        onValueChange={(value) => setUiLocale(value as UiLocale)}
      >
        <SelectTrigger id="language-select" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_UI_LOCALES.map((available) => (
            <SelectItem key={available} value={available}>
              {uiLocaleName(available)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const SettingsDialog = ({ isOpen, onClose }: Props) => {
  const theme = useTheme();
  const { _ } = useLingui();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans id="settings.title">Settings</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="settings.description">
              Configure application preferences
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              <Trans id="settings.appearance.heading">Appearance</Trans>
            </h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-select">
                <Trans id="settings.theme.label">Theme</Trans>
              </Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                <SelectTrigger id="theme-select" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {_(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LanguageSetting />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
