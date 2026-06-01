import Link from "next/link";
import AuthForms from "@/components/AuthForms";
import { LanguageSwitcher } from "@/components/LanguageProvider";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#081018] px-5 py-8 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="text-sm text-[#e6f15a]">Back to landing</Link>
            <LanguageSwitcher compact />
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">Sign in to DQL Builder</h1>
          <p className="mt-4 max-w-md leading-7 text-slate-300">
            Customers use the secure email link sent after approval. Admins can sign in with the shared admin password.
          </p>
        </div>
        <AuthForms initialMode="login" />
      </div>
    </main>
  );
}
