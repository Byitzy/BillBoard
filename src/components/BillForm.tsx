export default function BillForm() {
  return (
    <form className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border rounded p-2 bg-transparent" placeholder="Title" />
        <input className="border rounded p-2 bg-transparent" placeholder="Amount (CAD)" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border rounded p-2 bg-transparent" placeholder="Vendor" />
        <input className="border rounded p-2 bg-transparent" placeholder="Project" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border rounded p-2 bg-transparent" placeholder="One-off Due Date" />
        <input className="border rounded p-2 bg-transparent" placeholder="Recurring Rule (JSON)" />
      </div>
      <button type="submit" className="rounded bg-blue-600 text-white px-3 py-1 text-sm">Save</button>
    </form>
  );
}

