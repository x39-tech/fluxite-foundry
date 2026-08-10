import { ReactElement, ReactNode } from "react";
import {
  render as testingLibraryRender,
  RenderOptions,
} from "@testing-library/react";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const AppProviders = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

/**
 * Renders a localized component.
 *
 * Use this in place of React Testing Library's own `render` whenever the
 * component under test, or anything it draws, shows text to the user.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return testingLibraryRender(ui, { wrapper: AppProviders, ...options });
}

export * from "@testing-library/react";
