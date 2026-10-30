import { Suspense } from "react";
import StudentShell from "@/components/student-shell";
import PageSkeleton from "@/components/brand/page-skeleton";

// The sidebar reads the current URL (active link, unread count), so it
// streams in behind Suspense instead of blocking the prefetched shell.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 lg:ml-64">
          <PageSkeleton />
        </div>
      }
    >
      <StudentShell>{children}</StudentShell>
    </Suspense>
  );
}
