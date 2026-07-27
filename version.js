/** App version & author — bump when shipping user-facing changes. */
export const APP_NAME = "Starship Custom Name";
export const APP_VERSION = "2.0.1";

export const AUTHOR = {
  name: "David Leeds",
  handle: "leedsexplore",
  url: "https://github.com/leedsexplore",
  repo: "https://github.com/leedsexplore/starship-custom-name",
  pages: "https://leedsexplore.github.io/starship-custom-name/",
};

export function versionLabel() {
  return `v${APP_VERSION}`;
}

export function creditLine() {
  return `${APP_NAME} ${versionLabel()} by ${AUTHOR.name}`;
}
