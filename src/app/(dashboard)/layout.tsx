import DashboardLayoutUI from '@/components/dashboard/DashboardLayoutUI';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutUI>{children}</DashboardLayoutUI>;
}
