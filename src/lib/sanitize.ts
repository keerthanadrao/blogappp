/**
 * sanitize.ts
 * -----------
 * Shared safe HTML sanitisation utility.
 * Uses isomorphic-dompurify (works on both server and client).
 *
 * Only allows a curated list of safe formatting tags and attributes.
 * Strips all event handlers, script tags, iframes, and any other
 * potentially dangerous HTML before rendering.
 */

import DOMPurify from "isomorphic-dompurify";

/** Tags that are safe to render from rich-text editor output */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "span",
  "div",
  "hr",
];

/** Attributes that are safe (no event handlers, no javascript: hrefs) */
const ALLOWED_ATTR = ["class", "style"];

/**
 * Sanitise a rich-text HTML string.
 * Safe to call on server (SSR) and client.
 *
 * @param dirty - Raw HTML string from the rich-text editor
 * @returns Sanitised HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Prevent DOM clobbering and prototype pollution
    FORBID_ATTR: ["id", "name"],
    // Strip any data-* attributes
    ALLOW_DATA_ATTR: false,
    // Prevent javascript: URLs
    FORCE_BODY: false,
    // Remove all event handlers
    ADD_TAGS: [],
    ADD_ATTR: [],
  });
}
