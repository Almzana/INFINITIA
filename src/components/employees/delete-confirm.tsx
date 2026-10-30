import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { t } from "@/i18n"

export function DeleteConfirm({ ids, onCancel, onConfirm }: { ids: string[] | null; onCancel: () => void; onConfirm: (ids: string[]) => void }) {
  return (
    <AlertDialog open={!!ids} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("employees.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("employees.delete.description", { n: ids?.length ?? 0 })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => ids && onConfirm(ids)}>
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
