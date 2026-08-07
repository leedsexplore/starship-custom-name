/** App version & author — bump when shipping user-facing changes. */
export const APP_NAME = "Starship Custom Name";
export const APP_VERSION = "2.4.48";

export const AUTHOR = {
  name: "David Leeds",
  url: "https://github.com/leedsexplore",
  repo: "https://github.com/leedsexplore/starship-custom-name",
};

export function versionLabel() {
  return `v${APP_VERSION}`;
}

export function creditLine() {
  return `${APP_NAME} ${versionLabel()} by ${AUTHOR.name}`;
}
