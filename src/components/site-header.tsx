import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

interface SiteHeaderProps {
  isAdmin?: boolean;
  showAdminButton?: boolean;
  adminButtonHref?: string;
  adminButtonText?: string;
}

export function SiteHeader({
  isAdmin,
  showAdminButton = false,
  adminButtonHref,
  adminButtonText,
}: SiteHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CharacterFits Logo"
              width={200}
              height={60}
              className="max-h-12 sm:max-h-16 md:max-h-20 w-auto object-contain"
              priority
            />
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/search"
            className="inline-flex items-center p-2 sm:px-4 sm:py-2 text-gray-700 hover:text-gray-900 transition-colors"
            title="Search"
          >
            <svg
              className="w-5 h-5 sm:mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden sm:inline">Search</span>
          </Link>
          {showAdminButton && isAdmin && adminButtonHref && (
            <Link
              href={adminButtonHref}
              className="inline-flex items-center p-2 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              title={adminButtonText || "Edit"}
            >
              <svg
                className="w-5 h-5 sm:mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="hidden sm:inline">
                {adminButtonText || "Edit"}
              </span>
            </Link>
          )}
          {isAdmin && !showAdminButton && (
            <Link
              href="/admin"
              className="p-2 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm sm:text-base"
              title="Admin Dashboard"
            >
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          )}
          {isAdmin && <UserButton afterSignOutUrl="/" />}
        </div>
      </div>
    </header>
  );
}
