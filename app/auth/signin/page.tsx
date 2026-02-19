import { signIn } from "@/lib/auth";
import { GitBranch } from "lucide-react";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <main className="min-h-screen bg-[#0B0B0C] flex items-center justify-center px-4">
      <div className="border border-[#2A2A2E] bg-[#111114] rounded-xl p-8 w-full max-w-sm text-center">
        <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center mx-auto mb-6">
          <GitBranch className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Sign in to GraphyyCode</h1>
        <p className="text-sm text-[#8A8A9A] mb-8">
          Sign in to save your analysis history and unlock all features.
        </p>

        <SignInWithGoogle searchParams={searchParams} />

        <p className="text-xs text-[#4A4A5A] mt-6">
          By signing in you agree to our{" "}
          <a href="#" className="text-[#8A8A9A] hover:text-white">Terms</a>{" "}
          and{" "}
          <a href="#" className="text-[#8A8A9A] hover:text-white">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}

async function SignInWithGoogle({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const error = params.error;

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-900/20 border border-red-800 text-red-400 text-xs">
          {error === "OAuthAccountNotLinked"
            ? "An account with this email already exists. Try signing in differently."
            : "Authentication failed. Please try again."}
        </div>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl });
        }}
      >
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 h-11 bg-white text-black rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </form>
    </>
  );
}
