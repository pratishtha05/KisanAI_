"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAuthRoute = pathname.startsWith("/auth") || pathname === "/welcome";
    const isAppRoute = pathname.startsWith("/app") || pathname === "/onboarding";

    if (token) {
      if (isAuthRoute) {
        router.replace("/app");
      } else {
        setIsReady(true);
      }
    } else {
      if (isAppRoute) {
        router.replace("/welcome");
      } else {
        setIsReady(true);
      }
    }
  }, [pathname, router]);

  if (!isReady) return null; // or a loading spinner

  return <>{children}</>;
}
