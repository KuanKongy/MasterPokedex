/**
 * Resolves image references coming out of the API. Curated art (region maps,
 * location shots, demo avatars) is self-hosted under public/ and stored in the
 * database as a relative path like `maps/kanto.webp`; user-supplied avatars
 * remain absolute URLs. The app is served under a base path (/MasterPokedex/),
 * so relative paths must be resolved against it, never against the origin.
 */
export function resolveAsset(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
