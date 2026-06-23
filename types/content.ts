export type ImageBlock = { type: "image"; key: string }
export type HeadingBlock = { type: "heading"; level: 1 | 2 | 3; text: string }
export type ParagraphBlock = { type: "paragraph"; text: string }
export type BulletListBlock = { type: "bulletList"; items: string[]; ordered?: boolean }
export type MediaBlock = { type: "media"; mediaType: "image" | "video" | "audio"; key: string; caption?: string }

export type ContentBlock = ImageBlock | HeadingBlock | ParagraphBlock | BulletListBlock | MediaBlock

export function parseContent(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (b) => b !== null && typeof b === "object" && typeof (b as Record<string, unknown>).type === "string"
    )
    .map((b) => {
      // Normalize legacy "text" blocks to "paragraph"
      if ((b as Record<string, unknown>).type === "text") {
        return { type: "paragraph", text: String((b as Record<string, unknown>).text ?? "") } as ContentBlock
      }
      return b as ContentBlock
    })
}
