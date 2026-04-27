"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Briefcase, User, LogOut, Zap } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Trabajos", icon: Briefcase },
  { href: "/profile/setup", label: "Mi Perfil", icon: User },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const initial = userEmail?.[0]?.toUpperCase() || "U";

  return (
    <aside className="w-60 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-none">AutoApply</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Chile</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon
                size={16}
                className={`transition-colors ${isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600"}`}
              />
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 bg-primary-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-violet-400 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initial}</span>
          </div>
          <p className="text-xs text-slate-500 truncate flex-1">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-red-500 transition-colors w-full px-2 py-2 rounded-lg hover:bg-red-50"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
