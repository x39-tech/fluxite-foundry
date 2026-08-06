// Media types, which E1.73 requires to be registered with IANA. The registry
// snapshot beside this file is generated and updated from CI.

import registry from "./ianaMediaTypes.json";

/** Every media type in the bundled registry snapshot, sorted. */
export const ianaMediaTypes: readonly string[] = registry.mediaTypes;

/** The date the bundled snapshot was taken, as an ISO date. */
export const ianaRegistryRetrieved: string = registry.retrieved;

// Registered media types are compared without regard to case, per RFC 6838.
const byLowerCase = new Map(
  ianaMediaTypes.map((mediaType) => [mediaType.toLowerCase(), mediaType]),
);

/** Whether a media type appears in the bundled registry snapshot. */
export function isRegisteredMediaType(mediaType: string): boolean {
  return byLowerCase.has(mediaType.trim().toLowerCase());
}

/**
 * The registered spelling of a media type, or undefined if it is not
 * registered. Use this to normalize a value that differs only by case.
 */
export function registeredMediaType(mediaType: string): string | undefined {
  return byLowerCase.get(mediaType.trim().toLowerCase());
}

/** The part of a media type before the slash, e.g. "image" in "image/png". */
export function topLevelTypeOf(mediaType: string): string {
  const slash = mediaType.indexOf("/");
  return slash === -1 ? mediaType : mediaType.slice(0, slash);
}

/**
 * Registered media types matching a search, closest match first: whole-string
 * prefix, then subtype prefix, then anything containing the search text. So
 * searching "json" offers "application/json" ahead of
 * "application/3gpp-mbs-object-manifest+json".
 *
 * `limit` caps the result count.
 */
export function searchMediaTypes(search: string, limit: number): string[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return ianaMediaTypes.slice(0, limit);
  }

  const prefixed: string[] = [];
  const subtypePrefixed: string[] = [];
  const contained: string[] = [];

  for (const mediaType of ianaMediaTypes) {
    const candidate = mediaType.toLowerCase();

    if (candidate.startsWith(query)) {
      prefixed.push(mediaType);
      if (prefixed.length >= limit) break;
    } else if (candidate.slice(candidate.indexOf("/") + 1).startsWith(query)) {
      subtypePrefixed.push(mediaType);
    } else if (candidate.includes(query)) {
      contained.push(mediaType);
    }
  }

  return [...prefixed, ...subtypePrefixed, ...contained].slice(0, limit);
}

export interface MediaTypeGroup {
  topLevelType: string;
  /** The first `limitPerType` media types of this top-level type. */
  mediaTypes: string[];
  /** How many the registry holds in total, which may exceed what is listed. */
  total: number;
}

export function mediaTypeGroups(limitPerType: number): MediaTypeGroup[] {
  const groups: MediaTypeGroup[] = [];

  for (const mediaType of ianaMediaTypes) {
    const topLevelType = topLevelTypeOf(mediaType);
    let group = groups[groups.length - 1];

    if (group?.topLevelType !== topLevelType) {
      group = { topLevelType, mediaTypes: [], total: 0 };
      groups.push(group);
    }

    group.total++;
    if (group.mediaTypes.length < limitPerType) {
      group.mediaTypes.push(mediaType);
    }
  }

  return groups;
}
