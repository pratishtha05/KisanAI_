"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Sprout, Bot, Leaf } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  
  const navItems = [
    { href: "/app", icon: Home, label: t("nav.home", "Home") },
    { href: "/app/farm-advisor", icon: Bot, label: t("nav.advisor", "Ask KisanAI") },
    { href: "/app/disease-detection", icon: Leaf, label: t("nav.health", "Crop Health") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-green-600" : "text-gray-500 hover:text-green-600"
              )}
            >
              <item.icon size={24} className={isActive ? "fill-green-100" : ""} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
