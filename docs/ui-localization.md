# Localization

Localization for the app is separated between two concerns:

1. Translating the app's UI
2. Translating text in Fluxite Codex documents, which has its own localization system

This section describes our strategy for (1).

## Lingui

We use [Lingui](https://lingui.dev/) for UI localization.

## Writing user-visible text

For user-visible text rendered in TSX, wrap it in `Trans` and give it an ID:

```tsx
import { Trans } from "@lingui/react/macro";

<DialogTitle>
  <Trans id="settings.title">Settings</Trans>
</DialogTitle>;
```

The US English written inside the Trans tag is the source of truth for the US English version of the app.

Always import `Trans` from `@lingui/react/macro`, not from `@lingui/react`, to enable Lingui's precompilation features (see [Macros](https://lingui.dev/ref/macro)).

For a string that is not written directly in the page, use `msg` to record it and translate it where it is displayed:

```tsx
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

// Built once when the file loads, before any language is chosen.
const options = [
  {
    value: "light",
    label: msg({ id: "settings.theme.light", message: "Light" }),
  },
];

const Component = () => {
  const { _ } = useLingui();
  return <span>{_(options[0].label)}</span>;
};
```

Use this form for anything held in a variable, in a constant, or in state.

### Filling in placeholders

A common pattern might be to define some constant messages with value placeholders, like this:

```ts
export const CLASS_IN_USE_MESSAGES: Record<
  ReferenceableClassKind,
  MessageDescriptor
> = {
  parameterClasses: msg({
    id: "classes.parameterClasses.inUse",
    message:
      "Parameter class {codexId} is in use. Remove it from these parameters first: {referrers}",
  }),
  // ...
};
```

At the site that these message descriptors are used, use spread syntax to give values to the placeholders:

```tsx
_({
  ...CLASS_IN_USE_MESSAGES.parameterClasses,
  values: { codexId, referrers },
});
```

### Outside a component

`useLingui` needs a component to be called from. Code that shows text from somewhere else, e.g. a toast fired by an event handler, resolves against the active catalog directly:

```ts
import { i18n } from "@lingui/core";

toast.error(i18n._(MESSAGES.checkFailed));
```

The i18n catalog is initialized very early in app startup, so this is always safe. Just be mindful of the fact that this call reads the language once, at time of call, and doesn't subscribe to language changes like `useLingui` does.

## Errors a user reads

Use `LocalizedError` if business logic is throwing an error which can surface in a user-visible component.

```ts
throw new LocalizedError({
  ...ERRORS.notADocument,
  values: { appName: APP_NAME },
});
```

## Undo and redo

Each change in the undo/redo stack carries a `MessageDescriptor` that describes the action that is being undone or redone, which is shown as e.g. "Undo Add Parameter".

These messages should always be unique to undo/redo and never shared with e.g. the UI button that performs the action, because the undo/redo messages are used in the sentence context ("Add Parameter" becomes "Undo Add Parameter"), which might need a different grammatical construct than when used elsewhere in the UI.

By convention, action names live in an `UNDO` constant beside the code that makes the change:

```ts
const UNDO = {
  addParameter: msg({
    id: "parameters.undo.addParameter",
    message: "Add Parameter",
  }),
};

updateCurrentEditor(UNDO.addParameter, (editor) => {
  // ...
});
```

## Tips and Tricks

Avoid building sentences from separate pieces:

```tsx
<span>Add {itemType}</span> // where itemType is more English text
```

This doesn't survive a translation to a language that has a different sentence structure.

Other languages put words in a different order, and many change the shape of a noun depending on the words around it. Write each complete sentence as its own string instead.

Use `Plural` for working with counts.

```tsx
import { Plural } from "@lingui/react/macro";

<Plural
  id="dmx.slotCount"
  value={count}
  one="# DMX slot"
  other="# DMX slots"
/>;
```

## Suppressing Lints

We have eslint rules to try to catch unlocalized text in the app. These rules are not perfect and can have false negatives and false positives. To work around false positives, you can locally disable the `lingui/no-unlocalized-strings` lint.

## Use Explicit IDs

Every translatable string gets a ID, like `settings.theme.label`. Note that this is one of multiple approaches Lingui supports (see [Explicit vs Generated IDs](https://lingui.dev/guides/explicit-vs-generated-ids) - we use explicit IDs.

IDs should describe where a string is used and what it does, rather than what it says. Every ID must be unique throughout the app. We use a rough convention of `<feature>.<component>.<stringPurpose>`, e.g. `deviceClassEditor.parametersEditor.newParam`.

## Where the strings live

One file per language in `src/locales/`, written by:

```
npm run i18n:extract
```

Run this after adding or changing any string.

Each entry holds both the English (`message`) and the translation for that language (`translation`):

```json
"settings.theme.label": {
  "message": "Theme",
  "translation": "Thema"
}
```

`en.json` is generated from the code and should not be edited by hand (its source of truth is the US English strings used in the app's components). The extract step overwrites it. Edits that change the US English text of a component will show up in the diff of this file, which is expected and should be reviewed.

## Choosing a language

The app is wrapped in `UiLocaleProvider`, which resolves the language the app should be displayed in and swaps the catalog when the user's choice changes.

`uiLocale` in the persistent state's `appSettings` stores the language the app's UI is displayed in. It can be read with `useUiLocale()` and changed with `setUiLocale()`. This is distinct from `authoringLocale`, which is the locale that Fluxite Codex documents are read and authored in.

`resolveUiLocale` resolves the stored setting into a language we actually have using a standard fallback algorithm.

### Adding a language

1. Add it to `locales` in `lingui.config.ts` and to `UI_LOCALE_NAMES` in `app/i18n.tsx`; in the latter place, it should be named it in its own language.
2. Add a loader for it to `CATALOG_LOADERS`.
3. If the language is a regional variant of another language we have translations for, consider whether it needs a defined fallback in `fallbackLocales` in the config.
4. Consider whether any tests are necessary for testing the runtime behavior around selecting the new language. Potentially add tests in a new i18n.test.ts around the functions like `negotiateUiLocale()` and `resolveUiLocale()`.

## The "pseudo-LOCALE" language

`pseudo-LOCALE` is used to check the app's readiness for localization; see [Pseudolocalization](https://lingui.dev/guides/pseudolocalization). In dev mode, the UI language picker exposes a "Pseudo" option that can be used to put the app in this mode.

## Deliberately untranslated items

- Identifiers from the standard: Data types, media types, unit names, etc. which come from E1.73 and which users might want to correlate to their reading of the standard.
- Debug-only items, such as the state migration report.

## Tests

Tests read the interface in US English and look for the same words a user sees.

We have a helper wrapper for `testing-library`'s `render` in `src/test/render.tsx`. It re-exports everything from Testing Library, but its `render` wraps the given component in localization.

```tsx
import { render, screen } from "test/render";
```

If you need to test something that takes an undo/redo label, `testUndoLabel` is a useful helper:

```tsx
import { testUndoLabel } from "test/utils";

updateCurrentEditor(testUndoLabel("Rename") /* ... */);
```
