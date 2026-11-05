import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8">
        <Logo className="text-xl" />
      </Link>
      <div className="card w-full max-w-md p-6 sm:p-8">{children}</div>
    </div>
  );
}
