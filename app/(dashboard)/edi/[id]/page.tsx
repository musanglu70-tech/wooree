import { EdiDetailContent } from "@/components/edi/edi-detail-content";

export default async function EdiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-8">
      <div className="mx-auto max-w-[1400px]">
        <EdiDetailContent id={id} />
      </div>
    </div>
  );
}
