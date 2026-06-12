import SkeletonBlocks from './SkeletonBlocks';

export default function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{label}</p>
      <SkeletonBlocks rows={4} />
    </div>
  );
}

export function TenantWorkspaceLoading() {
  return <WorkspaceLoading label="Loading tenant workspace…" />;
}

export function LandlordWorkspaceLoading() {
  return <WorkspaceLoading label="Loading partner workspace…" />;
}

export function AdminWorkspaceLoading() {
  return <WorkspaceLoading label="Loading admin workspace…" />;
}
