import type { TagType } from "@/components/shared/tag"
import type { Announcement } from "@/data/mock"
import { t } from "@/i18n"

// Category values are stored in the database as-is; only the displayed label is translated.
export const categories: Announcement["category"][] = ["ทั่วไป", "HR", "IT", "กิจกรรม"]
export const categoryTag: Record<Announcement["category"], TagType> = { ทั่วไป: "info", HR: "primary", IT: "warning", กิจกรรม: "success" }
const categoryKey: Record<Announcement["category"], string> = { ทั่วไป: "general", HR: "hr", IT: "it", กิจกรรม: "activity" }
export const categoryLabel = (c: Announcement["category"]) => t(`announcements.category.${categoryKey[c]}`)
