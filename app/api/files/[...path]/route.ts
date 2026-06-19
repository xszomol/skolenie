import { auth } from "@/auth"
import { minioClient } from "@/lib/storage"
import { NextResponse } from "next/server"

const BUCKET = process.env.MINIO_BUCKET ?? "skolenie"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { path } = await params
  const key = path.join("/")

  try {
    const stream = await minioClient.getObject(BUCKET, key)
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const buffer = Buffer.concat(chunks)

    const contentType = key.endsWith(".png")
      ? "image/png"
      : key.endsWith(".jpg") || key.endsWith(".jpeg")
      ? "image/jpeg"
      : key.endsWith(".pdf")
      ? "application/pdf"
      : "application/octet-stream"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
