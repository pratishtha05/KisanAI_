"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const profileComplete = localStorage.getItem("profile_complete") === "true";
    
    // Allowed when logged out
    const isPublicRoute = 
        pathname === "/" || 
        pathname === "/welcome" || 
        pathname === "/language" || 
        pathname.startsWith("/auth");

    if (token) {
      if (isPublicRoute) {
        router.replace(profileComplete ? "/app" : "/onboarding");
      } else if (pathname === "/onboarding" && profileComplete) {
        router.replace("/app");
      } else if (pathname.startsWith("/app") && !profileComplete) {
        router.replace("/onboarding");
      } else {
        setIsReady(true);
      }
    } else {
      if (!isPublicRoute) {
        router.replace("/welcome");
      } else {
        setIsReady(true);
      }
    }
  }, [pathname, router]);

  if (!isReady) return null; // Wait for logic

  return <>{children}</>;
}
