import { TriangleAlertIcon } from "lucide-react";
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

const UNREGISTERED_REASON =
  "Not registered with IANA. E1.73 requires every media type to be one the registry lists.";

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
      note: `Showing ${shown} of ${total} registered media types. Type to search.`,
    };
  }

  const matches = searchMediaTypes(query, SEARCH_LIMIT);

  return {
    options: matches.map((value) => ({ value, group: undefined })),
    note:
      matches.length === SEARCH_LIMIT
        ? `Showing the first ${SEARCH_LIMIT} matches. Keep typing to narrow.`
        : undefined,
  };
}

function validateMediaType(mediaType: string): string | undefined {
  return isRegisteredMediaType(mediaType) ? undefined : UNREGISTERED_REASON;
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

  return (
    <div className="flex flex-col gap-1.5">
      <TagSelector
        className={className}
        values={values}
        search={mediaTypeOptions}
        onValuesChange={onValuesChange}
        validate={validateMediaType}
        addLabel="Add media type"
        searchPlaceholder="Search media types..."
        emptyMessage="No registered media type matches."
        {...props}
      />
      {unregistered.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <TriangleAlertIcon className="size-3.5 shrink-0 mt-px text-destructive" />
          <span>
            {unregistered.length === 1
              ? "1 media type is not in the IANA registry"
              : `${unregistered.length} media types are not in the IANA registry`}{" "}
            as of {ianaRegistryRetrieved}. Replace{" "}
            {unregistered.length === 1 ? "it" : "them"} with registered types,
            or remove {unregistered.length === 1 ? "it" : "them"}.
          </span>
        </p>
      )}
    </div>
  );
};
