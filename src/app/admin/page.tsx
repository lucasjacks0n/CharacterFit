"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function AdminPage() {
  const adminTools = [
    {
      title: "Product Importer",
      description: "Import clothing items from Amazon",
      href: "/admin/import",
      icon: "📦",
      color: "orange",
    },
    {
      title: "Manage Products",
      description: "View and edit your clothing catalog",
      href: "/admin/products/list",
      icon: "👕",
      color: "purple",
    },
    {
      title: "Manage Outfits",
      description: "View and edit outfit combinations",
      href: "/admin/outfits/list",
      icon: "👔",
      color: "blue",
    },
    {
      title: "Create Outfit",
      description: "Create new outfit combinations",
      href: "/admin/outfits",
      icon: "✨",
      color: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-orange-600 hover:text-orange-700"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your clothing catalog and outfit combinations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="block group"
            >
              <div
                className={`bg-white rounded-lg shadow-sm p-8 border-2 border-transparent hover:border-${tool.color}-500 hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{tool.icon}</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-gray-900 group-hover:text-gray-700 mb-2">
                      {tool.title}
                    </h2>
                    <p className="text-gray-600">{tool.description}</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
