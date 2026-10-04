import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { TopBar } from "@/components/layout/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DesktopNav />
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto w-full relative">
        <TopBar />
        <div className="mx-auto w-full">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
