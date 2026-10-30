import * as React from "react"
import Cropper, { type Area } from "react-easy-crop"
import { ZoomInIcon, ZoomOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { t } from "@/i18n"
import type { CropArea } from "@/lib/photo"

const MIN_ZOOM = 1
const MAX_ZOOM = 4

/** Drag / pinch / zoom the picked image inside a circle, then confirm the square that is kept. Keyed by `src`, so each picture starts centred. */
export function PhotoCropDialog({ src, onCancel, onConfirm }: { src: string | null; onCancel: () => void; onConfirm: (area: CropArea) => void }) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const area = React.useRef<Area | null>(null)

  const step = (d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + d).toFixed(2))))

  return (
    <Dialog open={!!src} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("photo.crop.title")}</DialogTitle>
          <DialogDescription>{t("photo.crop.description")}</DialogDescription>
        </DialogHeader>
        {/* Square sized from both viewport sides, so it fits short (landscape phone) screens too */}
        <div className="relative mx-auto size-[min(calc(100vw-4rem),calc(100svh-15rem),26rem)] min-h-40 min-w-40 overflow-hidden rounded-lg bg-black">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, px) => (area.current = px)}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(-0.25)} aria-label={t("photo.crop.zoomOut")}>
            <ZoomOutIcon />
          </Button>
          <Slider value={[zoom]} min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} onValueChange={([z]) => setZoom(z)} aria-label={t("photo.crop.zoom")} />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(0.25)} aria-label={t("photo.crop.zoomIn")}>
            <ZoomInIcon />
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button type="button" onClick={() => area.current && onConfirm(area.current)}>{t("photo.crop.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
