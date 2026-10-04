"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Sprout, Bot, Leaf, LogOut, CloudSun } from "lucide-react";

import { Noto_Serif } from "next/font/google";
import { useLanguage } from "@/lib/LanguageContext";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  
  const navItems = [
    { href: "/app", icon: Home, label: t("nav.home", "Home") },
    { href: "/app/weather", icon: CloudSun, label: t("nav.weather", "Weather") },
    { href: "/app/farm-advisor", icon: Bot, label: t("nav.advisor", "Ask KisanAI") },
    { href: "/app/disease-detection", icon: Leaf, label: t("nav.health", "Crop Health") },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white min-h-screen p-4 sticky top-0 h-screen">
      <div className="flex items-center gap-2 px-4 py-6 mb-4">
        <Leaf className="text-green-700" size={28} />
        <span className={`${serif.className} font-bold text-2xl tracking-tight text-green-900`}>KisanAI</span>
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
                isActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon size={20} className={isActive ? "text-green-600" : "text-gray-400"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t pt-4">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-red-600 hover:bg-red-50 w-full text-left"
        >
          <LogOut size={20} />
          {t("nav.logout", "Logout")}
        </button>
      </div>
    </aside>
  );
}
