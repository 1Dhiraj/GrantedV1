// Narrow media MIME helper surface for plugins that do not need the full media runtime.

export {
  detectMime,
  extensionForMime,
  getFileExtension,
  mimeTypeFromFilePath,
  normalizeMimeType,
} from "@granted/media-core/mime";
export { mediaKindFromMime, type MediaKind } from "@granted/media-core/constants";
