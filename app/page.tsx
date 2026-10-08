import AppHeader from "./components/AppHeader";
import { SessionProvider } from "next-auth/react";
import PromptTextArea from "./components/PromptTextArea";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SessionProvider>
        <AppHeader />
        <PromptTextArea/>
      </SessionProvider>
    </div>
  );
}
