import { EdiInspectDetail } from "@/components/edi/edi-inspect-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EdiInspectDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="h-screen overflow-hidden">
      <EdiInspectDetail prescriptionId={id} />
    </div>
  );
}
