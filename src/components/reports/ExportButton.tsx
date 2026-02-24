import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";

interface Props {
  data: any[];
}

export function ExportButton({ data }: Props) {
  const handleExport = () => {
    if (!data.length) return;
    const headers = ["Date", "Punch In", "Punch Out", "Hours", "Status"];
    const rows = data.map((r: any) => [
      format(new Date(r.punch_in), "yyyy-MM-dd"),
      format(new Date(r.punch_in), "HH:mm"),
      r.punch_out ? format(new Date(r.punch_out), "HH:mm") : "",
      r.total_hours ?? "",
      r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={!data.length}>
      <Download className="mr-2 h-4 w-4" /> Export CSV
    </Button>
  );
}
