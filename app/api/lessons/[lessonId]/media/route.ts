import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/storage"
import busboy from "busboy"

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "tiff", "tif"])
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v"])
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"])

function getMediaType(mime: string, filename: string): "image" | "video" | "audio" | null {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (IMAGE_EXTS.has(ext)) return "image"
  if (VIDEO_EXTS.has(ext)) return "video"
  if (AUDIO_EXTS.has(ext)) return "audio"
  return null
}

async function parseMultipart(
  request: Request,
  contentType: string
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  // Collect the full body first to avoid stream piping issues with Next.js internals
  if (!request.body) throw new Error("No request body")

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const rawBody = Buffer.concat(chunks.map((c) => Buffer.from(c)))

  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: 100 * 1024 * 1024 },
    })

    let resolved = false

    bb.on("file", (_field, file, info) => {
      const fileChunks: Buffer[] = []
      file.on("data", (chunk) => fileChunks.push(chunk as Buffer))
      file.on("close", () => {
        if (!resolved) {
          resolved = true
          resolve({
            buffer: Buffer.concat(fileChunks),
            mimeType: info.mimeType || "application/octet-stream",
            filename: info.filename,
          })
        }
      })
      file.on("error", reject)
    })

    bb.on("error", reject)
    bb.on("finish", () => {
      if (!resolved) reject(new Error("No file field in request"))
    })

    bb.write(rawBody)
    bb.end()
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { include: { trainers: true } } },
  })
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const roles = session.user.roles ?? []
  const userId = session.user.id
  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (lesson.course.primaryTrainerId === userId ||
      lesson.course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 })
  }

  try {
    const { buffer, mimeType, filename } = await parseMultipart(request, contentType)

    const mediaType = getMediaType(mimeType, filename)
    if (!mediaType) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })

    const ext = filename.split(".").pop()?.toLowerCase() ?? "bin"
    const key = `lessons/${lessonId}/media/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`

    await uploadFile(key, buffer, mimeType || "application/octet-stream")
    return NextResponse.json({ key, mediaType })
  } catch (e) {
    return NextResponse.json({ error: `Upload failed: ${String(e)}` }, { status: 500 })
  }
}
