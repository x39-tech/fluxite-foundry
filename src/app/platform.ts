export const isMacOS = (): boolean => navigator.userAgent.includes("Mac OS X");

export const isWindows = (): boolean => navigator.userAgent.includes("Windows");

export const applyPlatformTag = () => {
  if (isWindows()) {
    document.documentElement.dataset.platform = "windows";
  }
};
