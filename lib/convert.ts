import { exec } from "child_process"
import { promisify } from "util"
import { tmpdir } from "os"
import { join } from "path"
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises"
import { uploadFile } from "./storage"

const execAsync = promisify(exec)

export async function convertToPages(
  buffer: Buffer,
  ext: string,
  lessonId: string
): Promise<string[]> {
  const workDir = join(tmpdir(), `skolenie-${lessonId}-${Date.now()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const inputPath = join(workDir, `source.${ext}`)
    await writeFile(inputPath, buffer)

    let pdfPath = inputPath

    if (ext === "ppt" || ext === "pptx") {
      await execAsync(
        `libreoffice --headless --convert-to pdf --outdir "${workDir}" "${inputPath}"`
      )
      pdfPath = join(workDir, "source.pdf")
    }

    // pdftoppm comes from poppler-utils: apt install poppler-utils
    const outputPrefix = join(workDir, "page")
    await execAsync(`pdftoppm -r 150 -png "${pdfPath}" "${outputPrefix}"`)

    const files = (await readdir(workDir))
      .filter((f) => f.startsWith("page") && f.endsWith(".png"))
      .sort()

    const keys: string[] = []
    for (const file of files) {
      const imgBuffer = await readFile(join(workDir, file))
      const key = `lessons/${lessonId}/pages/${file}`
      await uploadFile(key, imgBuffer, "image/png")
      keys.push(key)
    }

    return keys
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
