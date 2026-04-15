import { BoomerangLoader } from '@/components/branding/BoomerangLoader';

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <BoomerangLoader layout="inline" size="lg" label="Loading..." />
    </div>
  );
}
