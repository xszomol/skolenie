import type { ContentBlock } from "@/types/content"

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "media") {
          return (
            <div key={i} className="space-y-1">
              {block.mediaType === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${block.key}`} alt={block.caption ?? ""} className="w-full rounded-lg" />
              )}
              {block.mediaType === "video" && (
                <video src={`/api/files/${block.key}`} controls className="w-full rounded-lg" />
              )}
              {block.mediaType === "audio" && (
                <audio src={`/api/files/${block.key}`} controls className="w-full" />
              )}
              {block.caption && (
                <p className="text-xs text-muted-foreground">{block.caption}</p>
              )}
            </div>
          )
        }
        if (block.type === "heading") {
          const cls =
            block.level === 1
              ? "text-2xl font-bold"
              : block.level === 2
              ? "text-xl font-semibold"
              : "text-lg font-medium"
          if (block.level === 1) return <h1 key={i} className={cls}>{block.text}</h1>
          if (block.level === 2) return <h2 key={i} className={cls}>{block.text}</h2>
          return <h3 key={i} className={cls}>{block.text}</h3>
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
              {block.text}
            </p>
          )
        }
        if (block.type === "bulletList") {
          const Tag = block.ordered ? "ol" : "ul"
          return (
            <Tag key={i} className={`${block.ordered ? "list-decimal" : "list-disc"} list-inside space-y-1`}>
              {block.items.map((item, j) => (
                <li key={j} className="text-sm">
                  {item}
                </li>
              ))}
            </Tag>
          )
        }
        return null
      })}
    </div>
  )
}
