"use client"

import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import GoogleSignInButton from './GoogleSignInButton'
import { Check } from 'lucide-react'

const page = () => {
  const router = useRouter()

  const resendAction = async (formData: FormData) => {
    const email = formData.get('email')
    if (typeof email !== 'string') return

    await signIn('resend', {
      email,
      redirect: true,
      callbackUrl: '/dashboard',
    })
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid md:grid-cols-[1.2fr_1fr] gap-8">
        <section className="rounded-xs border border-white/10 bg-[#0b0d10] p-10 shadow-[0_40px_120px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl font-black">Sign In</h1>
            <p className="text-gray-400">Welcome back! Please enter your details to sign in.</p>
          </div>

          <form action={resendAction}>
            <div className="space-y-3">
              <label className="text-sm text-gray-300 block" htmlFor="email-resend">
                Email:
              </label>
              <input type="email" id="email-resend" placeholder="example@luniobuilder.com" name="email" className="w-full rounded-lg border border-white/20 bg-[#0f131a] px-4 py-3 text-white outline-none focus:border-[#1d976c] focus:ring-2 focus:ring-[#1d976c]/30" />
              <input type="submit" value="Sign In with Email" className="w-full rounded-lg bg-[#b8f36b] px-6 py-3 text-md font-semibold text-black transition hover:bg-[#b8f36b]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" />
            </div>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-gray-500">
            <span className="h-px flex-1 bg-white/10" />
            Continue with
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex flex-col gap-4">
            <GoogleSignInButton />
          </div>

          <p className="mt-6 text-sm text-gray-400">
            By signing in, you agree to our <a href="/legal/terms" className="underline">Terms of Service</a> and <a href="/legal/privacy" className="underline">Privacy Policy</a>.
          </p>
        </section>

        <aside className="rounded-xs border border-white/10 bg-[#0b0d10] p-10 max-md:px-5">
          <div className="space-y-6">
            <div className="rounded-md bg-[#0b0d10] py-6 max-md:px-3">
              <p className="text-sm uppercase tracking-[0.24em] text-[#b8f36b]">Why choose LUNIO Builder?</p>
              <h2 className="mt-3 text-2xl font-bold">AI Visual Drag & Drop Editor Experience.</h2>
              <p className="mt-3 text-gray-400">Sign in once and access your dashboard, Generate with AI, Edit your projects and publish them. LUNIO Builder keeps your website builder workflow focused and modern.</p>
            </div>

            <div className="grid gap-4">
              {['No Code Editor', 'Instant Previews', 'Drag & Drop Experience', 'Fast Publishing'].map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-[#0b0d10] p-4 text-gray-300">
                  <Check size={18} className="inline-block mr-2 text-[#1d976c]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default page