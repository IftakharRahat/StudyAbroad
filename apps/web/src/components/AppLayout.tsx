import {
  Bell,
  Bookmark,
  Bot,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  Gauge,
  Globe2,
  GraduationCap,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../state/AuthContext";
import type { ProfileResponse } from "../types";

const navItems = [
  {
    label: "Dashboard",
    to: "/",
    icon: Gauge
  },
  {
    label: "University Search",
    to: "/matches",
    icon: Search
  },
  {
    label: "Strategy Builder",
    to: "/application-strategy",
    icon: ClipboardList
  },
  {
    label: "Scholarships",
    to: "/scholarships",
    icon: GraduationCap
  },
  {
    label: "Country Decision",
    to: "/countries",
    icon: Globe2
  },
  {
    label: "Application Tracker",
    to: "/deadlines",
    icon: FileText
  },
  {
    label: "Documents",
    to: "/documents",
    icon: FileText
  },
  {
    label: "Deadline Monitor",
    to: "/deadlines",
    icon: CalendarDays
  },
  {
    label: "AI Advisor",
    to: "/readiness",
    icon: Bot
  },
  {
    label: "Saved Items",
    to: "/saved",
    icon: Bookmark
  }
];

export function AppLayout() {
  const { user, token, logout } = useAuth();
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    async function loadProfileCompletion() {
      if (!token || user?.role !== "STUDENT") {
        return;
      }

      try {
        const response = await apiRequest<ProfileResponse>("/student/profile", {
          token
        });
        setProfileCompletion(response.completeness.complete ? 90 : Math.max(0, 90 - response.completeness.missingFields.length * 10));
      } catch {
        setProfileCompletion(0);
      }
    }

    loadProfileCompletion();
  }, [token, user?.role]);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#182033]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-[#e7eaf3] bg-white lg:flex lg:flex-col">
        <Link to="/" className="flex h-[72px] items-center gap-3 border-b border-[#e7eaf3] px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6d3df4] text-white">
            <GraduationCap className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-semibold leading-5 text-[#141b34]">StudyCompass</span>
            <span className="block text-[11px] font-medium text-[#7a8194]">Your Future, Our Guidance</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-4 py-7">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? "bg-[#f3efff] text-[#5f3bd7]" : "text-[#667085] hover:bg-[#f7f5ff] hover:text-[#5143b8]"}`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="my-4 border-t border-[#edf0f6]" />

          <NavLink
            to="/profile"
            className={({ isActive }) => `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? "bg-[#f3efff] text-[#5f3bd7]" : "text-[#667085] hover:bg-[#f7f5ff] hover:text-[#5143b8]"}`}
          >
            <UserRound className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            <span>Profile</span>
          </NavLink>
          <NavLink
            to="/readiness"
            className={({ isActive }) => `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? "bg-[#f3efff] text-[#5f3bd7]" : "text-[#667085] hover:bg-[#f7f5ff] hover:text-[#5143b8]"}`}
          >
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            <span>Readiness</span>
          </NavLink>
          <button
            type="button"
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#667085] hover:bg-[#f7f5ff] hover:text-[#5143b8]"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#667085] hover:bg-[#f7f5ff] hover:text-[#5143b8]"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </nav>

        <div className="px-5 pb-7">
          <div className="rounded-xl border border-[#eee9fb] bg-[#fbfaff] p-5 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[#6d3df4]">
              <GraduationCap className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[#2d3448]">{profileCompletion >= 80 ? "Great! Your profile is" : "Complete your profile"}</p>
            <p className="mt-1 text-sm font-medium text-[#2d3448]">{profileCompletion >= 80 ? "almost complete" : "to get better matches"}</p>
            <p className="mt-3 text-sm font-medium text-[#5f3bd7]">{profileCompletion}% Complete</p>
            <div className="mt-2 h-1.5 rounded-full bg-[#ece7fb]">
              <div className="h-full rounded-full bg-[#6d3df4]" style={{ width: `${profileCompletion}%` }} />
            </div>
            <Link to="/profile" className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#cfc7ff] bg-white text-sm font-semibold text-[#6d3df4] hover:bg-[#f7f5ff]">
              {profileCompletion >= 80 ? "Edit Profile" : "Complete Profile"}
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 h-[72px] border-b border-[#e7eaf3] bg-white">
          <div className="flex h-full items-center justify-between px-4 sm:px-8">
            <Link to="/" className="flex items-center gap-2 font-semibold text-[#141b34] lg:hidden">
              <GraduationCap className="h-5 w-5 text-[#5f3bd7]" strokeWidth={1.9} aria-hidden="true" />
              <span>StudyCompass</span>
            </Link>
            <div className="hidden h-10 w-full max-w-[420px] items-center gap-2 rounded-lg border border-[#e1e5ef] bg-white px-3 lg:flex">
              <Search className="h-4 w-4 text-[#8b92a7]" strokeWidth={1.8} aria-hidden="true" />
              <input
                placeholder="Search scholarships, universities..."
                className="w-full border-0 bg-transparent text-sm text-[#344054] outline-none placeholder:text-[#98a2b3]"
              />
              <span className="rounded-md bg-[#f6f7fb] px-2 py-1 text-[11px] font-semibold text-[#8b92a7]">Ctrl + K</span>
            </div>
            <div className="flex items-center gap-5">
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#344054] hover:bg-[#f7f5ff]"
                title="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#6d3df4]" />
              </button>
              <button
                type="button"
                className="relative hidden h-9 w-9 items-center justify-center rounded-full text-[#344054] hover:bg-[#f7f5ff] sm:flex"
                title="Messages"
              >
                <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffd4b5] text-sm font-medium text-[#703b1b]">
                  {user?.name?.slice(0, 1) ?? "R"}
                </div>
                <span className="hidden text-sm font-medium text-[#2d3448] sm:inline">{user?.name ?? "Rahim Ahmed"}</span>
                <ChevronDown className="h-4 w-4 text-[#667085]" strokeWidth={1.8} aria-hidden="true" />
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
