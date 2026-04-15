import { BoomerangLoader } from '@/components/branding/BoomerangLoader';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <BoomerangLoader layout="inline" size="xl" label="Loading..." />
    </div>
  );
}
