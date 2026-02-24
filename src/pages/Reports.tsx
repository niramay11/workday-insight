import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

const Reports = () => (
  <AppLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Reports</h1>
        <p className="text-muted-foreground mt-1">View attendance and productivity reports</p>
      </div>
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Coming Soon</p>
          <p className="text-muted-foreground text-sm mt-1">Reports and analytics will be available in the next update</p>
        </CardContent>
      </Card>
    </div>
  </AppLayout>
);

export default Reports;
