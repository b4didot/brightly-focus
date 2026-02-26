import type { ReactNode } from "react"
import { AppSidebar, PageContainer } from "@/components/layouts"

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer sidebar={<AppSidebar navLabels={["Nav 1", "Nav 2", "Nav 3"]} />}>
      {children}
    </PageContainer>
  )
}