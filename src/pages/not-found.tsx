import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">ไม่พบหน้าที่คุณต้องการ</h1>
        <p className="text-sm text-muted-foreground">หน้านี้อาจถูกย้ายหรือยังไม่เปิดใช้งาน</p>
      </div>
      <Button asChild>
        <Link to="/">กลับหน้าแรก</Link>
      </Button>
    </div>
  )
}
