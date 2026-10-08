"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function GoogleSignInButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full text-sm font-medium"
      onClick={() => signIn("google", { callbackUrl: "/" })}
    >
      Continue with Google
    </Button>
  );
}