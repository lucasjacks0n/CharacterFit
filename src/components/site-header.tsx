import Link from "next/link";
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <h1 className="text-3xl font-bold text-gray-900">CharacterFits</h1>
          <p className="text-gray-600 mt-1">
            Character Costume & Cosplay Builder
          </p>
        </Link>
        <div className="flex items-center gap-4">
          {showAdminButton && isAdmin && adminButtonHref && (
            <Link
              href={adminButtonHref}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
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
              {adminButtonText || "Edit"}
            </Link>
          )}
          {isAdmin && !showAdminButton && (
            <Link
              href="/admin"
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Admin Dashboard
            </Link>
          )}
          {isAdmin && <UserButton afterSignOutUrl="/" />}
        </div>
      </div>
    </header>
  );
}
