import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
