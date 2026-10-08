import AppHeader from "./components/AppHeader";
import { SessionProvider } from "next-auth/react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SessionProvider>
        <AppHeader />
      </SessionProvider>
    </div>
  );
}
