import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-white" role="status" aria-label="Loading dashboard">
      <div className="mx-auto align-middle px-6 py-14">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-black" />
      </div>
    </main>
  );
}