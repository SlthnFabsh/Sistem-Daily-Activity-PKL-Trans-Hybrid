import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="py-16 text-center">
        <p className="text-sm text-text-muted">Segera hadir</p>
      </Card>
    </>
  );
}