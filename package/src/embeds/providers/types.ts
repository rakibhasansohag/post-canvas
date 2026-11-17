// The embed provider contract. A provider turns a pasted page URL into a small `ref` of validated ids, and builds every
// iframe, canonical and oEmbed URL from that ref alone. Stored documents never hold a player URL.

/** The validated ids that identify one embed, such as `{ type: "track", id: "4uLU6hMCjMI75M1A2tKUQC" }`. */
export type EmbedRef = Record<string, string>;

/** How to load a provider's player. Every field is built from the ref, never from stored HTML or a stored URL. */
export interface EmbedFrame {
  /** The iframe URL. */
  src: string;
  /** An English fallback title. Views replace it with a translated one. */
  title: string;
  /** The iframe `allow` list. */
  allow: string;
  /** The iframe `sandbox` tokens: the provider's minimal set. */
  sandbox: string;
  /** Width divided by height, or `null` when the player has a fixed height. */
  aspectRatio: number | null;
  /** A fixed height in CSS pixels, for players that don't scale, such as audio. `null` otherwise. */
  height: number | null;
}

/** A third-party player Post Canvas can embed. Create one with `defineEmbedProvider()`. */
export interface EmbedProvider {
  /** A unique, lower-case name such as `spotify`. Stored in the `embed` node's `provider` attribute. */
  name: string;
  /** The display name, such as `Spotify`. */
  label: string;
  /**
   * Reads a page URL. Return the validated ids, or `null` when the URL isn't this provider's. The registry has already
   * refused anything that isn't http or https, carries a user name or password, or names a port, and lower-cased the
   * host. Check the host against an exact allowlist and every id against a strict pattern.
   */
  match(url: URL): EmbedRef | null;
  /** Builds the player from a ref that `match()` returned. */
  frame(ref: EmbedRef): EmbedFrame;
  /** The provider's own page for a ref: what "Open on…" links to and what oEmbed is asked about. */
  canonicalUrl(ref: EmbedRef): string;
  /** The provider's fixed oEmbed endpoint for a ref, if it has a public one. Used only on the server. */
  oembed?(ref: EmbedRef): string;
  /** A thumbnail URL built from the ref alone, if the provider has a predictable one. */
  thumbnail?(ref: EmbedRef): string | null;
  /** The default width-to-height ratio, or `null` for a fixed-height player. */
  aspectRatio: number | null;
}

/** A pasted URL that a provider recognised. */
export interface EmbedMatch {
  provider: EmbedProvider;
  ref: EmbedRef;
  /** The canonical page URL, rebuilt from the ref. */
  url: string;
}
