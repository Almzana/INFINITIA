/** URL of an employee's photo; the version busts the browser cache after a change. */
export const photoUrl = (employeeId: string, version?: number | null) =>
  version ? `/api/employees/${encodeURIComponent(employeeId)}/photo?v=${version}` : undefined

export const MAX_INPUT_BYTES = 15 * 1024 * 1024
const MAX_SIDE = 512

/** The square to keep, in pixels of the original image (from the crop dialog). */
export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/** Type and size checks before the crop dialog opens; throws the same codes as prepareAvatar. */
export function checkPhotoFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image")
  if (file.size > MAX_INPUT_BYTES) throw new Error("too-large")
}

/** Keep the crop square and inside the picture (the cropper can round a pixel past an edge). */
export function clampSquare(area: CropArea, width: number, height: number) {
  const side = Math.max(1, Math.round(Math.min(area.width, area.height, width, height)))
  const x = Math.min(Math.max(0, Math.round(area.x)), width - side)
  const y = Math.min(Math.max(0, Math.round(area.y)), height - side)
  return { x, y, side }
}

/**
 * Cut the chosen square (centre square when none is given), scale it down to at most 512×512 and
 * re-encode it. Re-drawing on a canvas also drops EXIF metadata such as GPS location from phone photos.
 */
export async function prepareAvatar(file: File, area?: CropArea): Promise<Blob> {
  checkPhotoFile(file)
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("unreadable")
  })
  const centre = Math.min(bitmap.width, bitmap.height)
  const { x, y, side } = clampSquare(
    area ?? { x: (bitmap.width - centre) / 2, y: (bitmap.height - centre) / 2, width: centre, height: centre },
    bitmap.width,
    bitmap.height,
  )
  const out = Math.min(MAX_SIDE, side)
  const canvas = document.createElement("canvas")
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("unreadable")
  ctx.drawImage(bitmap, x, y, side, side, 0, 0, out, out)
  bitmap.close()
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86))
  // WebP is smallest; browsers that cannot encode it (older Safari) return PNG instead, so fall back to JPEG
  const webp = await toBlob("image/webp")
  if (webp && webp.type === "image/webp") return webp
  const jpeg = await toBlob("image/jpeg")
  if (!jpeg) throw new Error("unreadable")
  return jpeg
}
