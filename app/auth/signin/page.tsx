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
          await signIn("github", { redirectTo: callbackUrl });
        }}
      >
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 h-11 bg-[#24292e] text-white rounded-md text-sm font-medium hover:bg-[#2f363d] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>
      </form>
    </>
  );
}
