import { auth } from "@/auth"
import { minioClient } from "@/lib/storage"
import { NextResponse } from "next/server"

const BUCKET = process.env.MINIO_BUCKET ?? "skolenie"

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { path } = await params
  const key = path.join("/")
  const ext = key.split(".").pop()?.toLowerCase() ?? ""
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream"

  try {
    const stat = await minioClient.statObject(BUCKET, key)
    const fileSize = stat.size

    const rangeHeader = request.headers.get("range")

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-")
      const start = parseInt(startStr, 10)
      const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : fileSize - 1
      const length = end - start + 1

      const stream = await minioClient.getPartialObject(BUCKET, key, start, length)
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(chunk as Buffer)

      return new NextResponse(Buffer.concat(chunks), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(length),
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    const stream = await minioClient.getObject(BUCKET, key)
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)

    return new NextResponse(Buffer.concat(chunks), {
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(fileSize),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
