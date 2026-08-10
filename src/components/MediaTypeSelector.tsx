import { TriangleAlertIcon } from "lucide-react";
import { msg } from "@lingui/core/macro";
import { Plural } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import {
  ianaRegistryRetrieved,
  isRegisteredMediaType,
  mediaTypeGroups,
  searchMediaTypes,
} from "codex/mediaTypes";
import { TagOptions, TagSelector } from "./TagSelector";

// How much of the registry the picker will render at once.
const SEARCH_LIMIT = 100;
const BROWSE_LIMIT_PER_TYPE = 15;

const MESSAGES = {
  unregisteredReason: msg({
    id: "mediaType.unregisteredReason",
    message:
      "Not registered with IANA. E1.73 requires every media type to be listed in the IANA registry.",
  }),
  add: msg({ id: "mediaType.add", message: "Add media type" }),
  search: msg({ id: "mediaType.search", message: "Search media types..." }),
  noMatches: msg({
    id: "mediaType.noMatches",
    message: "No registered media type matches the query.",
  }),
  browseNote: msg({
    id: "mediaType.browseNote",
    message:
      "Showing {shown} of {total} registered media types. Type to search.",
  }),
  searchLimitNote: msg({
    id: "mediaType.searchLimitNote",
    message: "Showing the first {limit} matches. Keep typing to narrow.",
  }),
};

function mediaTypeOptions(query: string): TagOptions {
  if (!query.trim()) {
    const groups = mediaTypeGroups(BROWSE_LIMIT_PER_TYPE);
    const total = groups.reduce((sum, group) => sum + group.total, 0);
    const shown = groups.reduce(
      (sum, group) => sum + group.mediaTypes.length,
      0,
    );

    return {
      options: groups.flatMap((group) =>
        group.mediaTypes.map((value) => ({
          value,
          group: `${group.topLevelType}/`,
        })),
      ),
      note: { ...MESSAGES.browseNote, values: { shown, total } },
    };
  }

  const matches = searchMediaTypes(query, SEARCH_LIMIT);

  return {
    options: matches.map((value) => ({ value, group: undefined })),
    note:
      matches.length === SEARCH_LIMIT
        ? { ...MESSAGES.searchLimitNote, values: { limit: SEARCH_LIMIT } }
        : undefined,
  };
}

interface Props {
  values: string[];
  onValuesChange: (values: string[]) => void;
  className?: string;
  "aria-labelledby"?: string;
}

export const MediaTypeSelector = ({
  values,
  onValuesChange,
  className,
  ...props
}: Props) => {
  const unregistered = values.filter((value) => !isRegisteredMediaType(value));
  const { _ } = useLingui();

  const validateMediaType = (mediaType: string): string | undefined =>
    isRegisteredMediaType(mediaType)
      ? undefined
      : _(MESSAGES.unregisteredReason);

  return (
    <div className="flex flex-col gap-1.5">
      <TagSelector
        className={className}
        values={values}
        search={mediaTypeOptions}
        onValuesChange={onValuesChange}
        validate={validateMediaType}
        addLabel={MESSAGES.add}
        searchPlaceholder={MESSAGES.search}
        emptyMessage={MESSAGES.noMatches}
        {...props}
      />
      {unregistered.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <TriangleAlertIcon className="size-3.5 shrink-0 mt-px text-destructive" />
          <span>
            <Plural
              id="mediaType.unregisteredWarning"
              value={unregistered.length}
              one={`1 media type is not in the IANA registry as of ${ianaRegistryRetrieved}. Replace it with a registered type, or remove it.`}
              other={`# media types are not in the IANA registry as of ${ianaRegistryRetrieved}. Replace them with registered types, or remove them.`}
            />
          </span>
        </p>
      )}
    </div>
  );
};
