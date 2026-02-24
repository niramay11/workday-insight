import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Save, Shield, Clock, Eye, EyeOff, Camera, Bell } from "lucide-react";

export function SettingsForm() {
  const { role } = useAuth();
  const { settings, updateSetting, regenerateKey } = useSettings();
  const [idleThreshold, setIdleThreshold] = useState("");
  const [expectedHours, setExpectedHours] = useState("");
  const [screenshotInterval, setScreenshotInterval] = useState("");
  const [missedPunchTime, setMissedPunchTime] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const data = settings.data;
  const isAdmin = role === "admin";

  const currentIdle = idleThreshold || data?.idle_threshold_minutes || "10";
  const currentHours = expectedHours || data?.expected_hours_per_day || "8";
  const currentScreenshotInterval = screenshotInterval || data?.screenshot_interval_minutes || "5";
  const currentMissedPunchTime = missedPunchTime || data?.missed_punch_alert_time || "10:00";

  const handleSaveGeneral = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "idle_threshold_minutes", value: currentIdle }),
        updateSetting.mutateAsync({ key: "expected_hours_per_day", value: currentHours }),
        updateSetting.mutateAsync({ key: "screenshot_interval_minutes", value: currentScreenshotInterval }),
        updateSetting.mutateAsync({ key: "missed_punch_alert_time", value: currentMissedPunchTime }),
      ]);
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  };

  const handleRegenerate = async (key: string) => {
    try {
      await regenerateKey.mutateAsync(key);
      toast({ title: `${key === "agent_api_key" ? "API Key" : "Webhook Secret"} regenerated` });
    } catch {
      toast({ title: "Error regenerating key", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const agentUrl = `https://${projectId}.supabase.co/functions/v1/agent-api`;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/webhook-receiver`;

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Admin Access Required</p>
          <p className="text-muted-foreground text-sm mt-1">Only admins can access application settings</p>
        </CardContent>
      </Card>
    );
  }

  if (settings.isLoading) {
    return <p className="text-muted-foreground text-sm text-center py-8">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" /> General Settings
          </CardTitle>
          <CardDescription>Configure attendance tracking parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Idle Threshold (minutes)</Label>
              <Input type="number" value={currentIdle} onChange={(e) => setIdleThreshold(e.target.value)} min={1} max={60} />
              <p className="text-xs text-muted-foreground">How long without activity triggers an idle alert</p>
            </div>
            <div className="space-y-2">
              <Label>Expected Hours Per Day</Label>
              <Input type="number" value={currentHours} onChange={(e) => setExpectedHours(e.target.value)} min={1} max={24} step={0.5} />
              <p className="text-xs text-muted-foreground">Target daily hours for "full day" status</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> Screenshot Interval (minutes)</Label>
              <Input type="number" value={currentScreenshotInterval} onChange={(e) => setScreenshotInterval(e.target.value)} min={1} max={60} />
              <p className="text-xs text-muted-foreground">How often the agent captures desktop screenshots</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Missed Punch Alert Time</Label>
              <Input type="time" value={currentMissedPunchTime} onChange={(e) => setMissedPunchTime(e.target.value)} />
              <p className="text-xs text-muted-foreground">Alert if employee hasn't punched in by this time</p>
            </div>
          </div>
          <Button onClick={handleSaveGeneral} disabled={updateSetting.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Agent API Configuration */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" /> Agent API
          </CardTitle>
          <CardDescription>Configure your desktop agent to connect using this API key and endpoint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Agent Endpoint URL</Label>
            <div className="flex gap-2">
              <Input value={agentUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(agentUrl, "Agent URL")}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input value={showApiKey ? (data?.agent_api_key ?? "") : "••••••••••••••••••••••••••••••••"} readOnly className="font-mono text-xs pr-10" />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(data?.agent_api_key ?? "", "API Key")}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => handleRegenerate("agent_api_key")}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" /> Webhook Receiver
          </CardTitle>
          <CardDescription>Configure third-party tools to send data to this webhook endpoint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Webhook Secret</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input value={showWebhookSecret ? (data?.webhook_secret ?? "") : "••••••••••••••••••••••••••••••••"} readOnly className="font-mono text-xs pr-10" />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowWebhookSecret(!showWebhookSecret)}>
                  {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(data?.webhook_secret ?? "", "Webhook Secret")}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => handleRegenerate("webhook_secret")}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Agent Setup */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" /> Desktop Agent
          </CardTitle>
          <CardDescription>Install the agent on employee PCs to capture screenshots and detect idle time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Quick Setup:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Download the <code className="text-xs bg-background px-1 py-0.5 rounded">desktop-agent/</code> folder from the project</li>
              <li>Install Python 3.9+ and run: <code className="text-xs bg-background px-1 py-0.5 rounded">pip install -r requirements.txt</code></li>
              <li>Copy <code className="text-xs bg-background px-1 py-0.5 rounded">config.example.json</code> to <code className="text-xs bg-background px-1 py-0.5 rounded">config.json</code></li>
              <li>Fill in the API URL, API Key, and User ID</li>
              <li>Run: <code className="text-xs bg-background px-1 py-0.5 rounded">python agent.py</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
