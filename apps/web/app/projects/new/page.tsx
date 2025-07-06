"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

// This page redirects to the projects page where the creation modal can be triggered
// We're moving away from separate pages to modal-based forms for better UX
export default function NewProjectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to projects page where the creation modal can be triggered
    // The sidebar already has the "New Project" button that opens the modal
    router.replace("/projects?openCreateProject=true");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to projects...</p>
      </div>
    </div>
  );
}
