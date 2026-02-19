import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] flex items-center justify-center px-4">
      <div className="border border-[#2A2A2E] bg-[#111114] rounded-xl p-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-white mb-2">Authentication Error</h1>
        <p className="text-sm text-[#8A8A9A] mb-6">
          Something went wrong during sign in. Please try again.
        </p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center h-9 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
