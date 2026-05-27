const allowedAvitoDescriptionTags = new Set(["p", "br", "strong", "em", "ul", "ol", "li"]);

export function sanitizeAvitoDescription(description: string) {
  return String(description ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\/?\s*([a-z][a-z0-9]*)\b[^<>]*\/?\s*>/gi, (match, rawTag: string) => {
      const tag = rawTag.toLowerCase();
      if (!allowedAvitoDescriptionTags.has(tag)) {
        return "";
      }
      if (tag === "br") {
        return "<br>";
      }
      return match.startsWith("</") ? `</${tag}>` : `<${tag}>`;
    })
    .replace(/\]\]>/g, "]]&gt;")
    .trim();
}
