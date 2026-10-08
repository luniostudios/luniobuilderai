import GoogleSignInButton from "@/app/login/GoogleSignInButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <section className="w-full max-w-sm space-y-8 rounded-2xl border border-border/70 bg-background p-8 shadow-sm">
        <div className="space-y-3 text-center">
          <p className="font-roboto text-4xl font-black">LUNIO Builder</p>
          <h1 className="font-heading text-xl font-light">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your websites.</p>
        </div>
        <GoogleSignInButton />
        <p className="text-center text-xs text-muted-foreground">
          New here? Google sign-in creates your account automatically.
        </p>
      </section>
    </main>
  );
}