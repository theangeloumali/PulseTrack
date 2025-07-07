import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | PulseTrack",
  description:
    "Your productivity command center - track projects, tasks, and team performance.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">{children}</div>
    </div>
  );
}
