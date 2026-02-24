import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => (
  <AppLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your application preferences</p>
      </div>
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <SettingsIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Coming Soon</p>
          <p className="text-muted-foreground text-sm mt-1">Application settings will be available in the next update</p>
        </CardContent>
      </Card>
    </div>
  </AppLayout>
);

export default Settings;
