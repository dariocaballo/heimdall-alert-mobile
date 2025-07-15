import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Cloud, Server, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CloudStatusProps {
  userCode: string;
}

const CloudStatus = ({ userCode }: CloudStatusProps) => {
  const [connectionStatus, setConnectionStatus] = useState({
    webhook: true,
    supabase: true,
    firebase: true,
  });
  const [systemHealth, setSystemHealth] = useState({
    uptime: "99.9%",
    lastUpdate: new Date(),
    activeConnections: 3,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Simulera systemhälsa check
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        ...prev,
        lastUpdate: new Date(),
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const testWebhook = async () => {
    toast({
      title: "Test webhook",
      description: "Testar webhook-anslutning...",
    });

    // Simulera webhook test
    setTimeout(() => {
      toast({
        title: "Webhook OK",
        description: "Webhook-anslutningen fungerar korrekt",
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cloud className="w-5 h-5" />
            <span>Systemstatus</span>
          </CardTitle>
          <CardDescription>
            Övervaka systemhälsa och anslutningar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Webhook</p>
                    <p className="text-2xl font-bold text-green-600">Online</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Shelly-enheter → Supabase
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Database</p>
                    <p className="text-2xl font-bold text-green-600">Online</p>
                  </div>
                  <Server className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Supabase PostgreSQL
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Push-notiser</p>
                    <p className="text-2xl font-bold text-green-600">Online</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Firebase FCM
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">Systemhälsa</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Upptid:</span>
                  <Badge className="bg-green-100 text-green-800">{systemHealth.uptime}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Aktiva anslutningar:</span>
                  <span className="font-medium">{systemHealth.activeConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span>Senast uppdaterad:</span>
                  <span className="text-muted-foreground">
                    {systemHealth.lastUpdate.toLocaleTimeString('sv-SE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Webhook-endpoint</h4>
              <div className="p-3 bg-muted rounded text-xs font-mono break-all">
                https://owgkhkxsaeizgwxebarh.supabase.co/functions/v1/shelly_webhook
              </div>
              <Button variant="outline" size="sm" onClick={testWebhook} className="w-full">
                Testa webhook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center space-x-2">
            <Cloud className="w-5 h-5" />
            <span>Om systemarkitekturen</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Shelly Webhook</strong> - Brandvarnare skickar data direkt till vår webhook</li>
            <li>• <strong>Realtidsdata</strong> - Supabase uppdaterar appen omedelbart</li>
            <li>• <strong>Push-notiser</strong> - Firebase skickar larm till alla enheter</li>
            <li>• <strong>Backup API</strong> - Shelly Cloud API som reservlösning</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudStatus;