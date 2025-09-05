type Props = { params: { id: string } };

export default function BillDetailPage({ params }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bill #{params.id}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">Occurrences</div>
          <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">Attachments</div>
          <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">Comments</div>
        </div>
        <div className="space-y-3">
          <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">Approval Panel</div>
          <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">Metadata</div>
        </div>
      </div>
    </div>
  );
}

