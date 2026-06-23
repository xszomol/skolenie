import { exec } from "child_process"
import { promisify } from "util"
import { tmpdir } from "os"
import { join } from "path"
import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises"
import { uploadFile } from "./storage"

const execAsync = promisify(exec)

export type PageResult = { key: string; title: string | null }

async function extractPptxTitles(filePath: string): Promise<(string | null)[]> {
  const script = `
import sys, json
try:
    from pptx import Presentation
    prs = Presentation(sys.argv[1])
    titles = []
    for slide in prs.slides:
        title = None
        for shape in slide.shapes:
            if hasattr(shape, "placeholder_format") and shape.placeholder_format and shape.placeholder_format.idx == 0:
                t = shape.text_frame.text.strip()
                if t:
                    title = t
                break
        titles.append(title)
    print(json.dumps(titles))
except Exception as e:
    print(json.dumps([]))
`
  try {
    const { stdout } = await execAsync(`python3 -c '${script.replace(/'/g, "'\\''")}' "${filePath}"`)
    return JSON.parse(stdout.trim())
  } catch {
    return []
  }
}

export async function convertToPages(
  buffer: Buffer,
  ext: string,
  lessonId: string
): Promise<PageResult[]> {
  const workDir = join(tmpdir(), `skolenie-${lessonId}-${Date.now()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const inputPath = join(workDir, `source.${ext}`)
    await writeFile(inputPath, buffer)

    let pdfPath = inputPath
    let slideTitles: (string | null)[] = []

    if (ext === "ppt" || ext === "pptx") {
      if (ext === "pptx") {
        slideTitles = await extractPptxTitles(inputPath)
      }
      await execAsync(
        `libreoffice --headless --convert-to pdf --outdir "${workDir}" "${inputPath}"`
      )
      pdfPath = join(workDir, "source.pdf")
    }

    const outputPrefix = join(workDir, "page")
    await execAsync(`pdftoppm -r 150 -png "${pdfPath}" "${outputPrefix}"`)

    const files = (await readdir(workDir))
      .filter((f) => f.startsWith("page") && f.endsWith(".png"))
      .sort()

    const results: PageResult[] = []
    for (let i = 0; i < files.length; i++) {
      const imgBuffer = await readFile(join(workDir, files[i]))
      const key = `lessons/${lessonId}/pages/${files[i]}`
      await uploadFile(key, imgBuffer, "image/png")
      results.push({ key, title: slideTitles[i] ?? null })
    }

    return results
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
