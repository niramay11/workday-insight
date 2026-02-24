import { AppLayout } from "@/components/layout/AppLayout";
import { SettingsForm } from "@/components/SettingsForm";

const Settings = () => (
  <AppLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your application preferences</p>
      </div>
      <SettingsForm />
    </div>
  </AppLayout>
);

export default Settings;
