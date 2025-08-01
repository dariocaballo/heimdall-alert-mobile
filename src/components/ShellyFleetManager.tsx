import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, Settings, Wifi } from "lucide-react";

interface ShellyFleetManagerProps {
  userCode: string;
  onConnectionChange?: (connected: boolean) => void;
}

const ShellyFleetManager = ({ userCode, onConnectionChange }: ShellyFleetManagerProps) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    url: 'wss://shelly-fleet-manager.example.com' // Standard SFM URL
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!credentials.username || !credentials.password || !credentials.url) {
      toast({
        title: "Obligatoriska fält",
        description: "Fyll i alla fält för att ansluta till Shelly Fleet Manager",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      // Authenticate with SFM
      const { data: authResult, error: authError } = await supabase.functions.invoke('shelly_fleet_manager', {
        body: {
          action: 'authenticate',
          credentials: {
            username: credentials.username,
            password: credentials.password,
            url: credentials.url
          },
          userCode
        }
      });

      if (authError || !authResult?.success) {
        throw new Error(authResult?.error || 'Autentisering misslyckades');
      }

      console.log('SFM Authentication successful:', authResult);

      // Start WebSocket subscription
      const { data: subscribeResult, error: subscribeError } = await supabase.functions.invoke('shelly_fleet_manager', {
        body: {
          action: 'subscribe',
          userCode
        }
      });

      if (subscribeError || !subscribeResult?.success) {
        throw new Error(subscribeResult?.error || 'WebSocket-anslutning misslyckades');
      }

      setIsConnected(true);
      setConnectionStatus('connected');
      onConnectionChange?.(true);

      toast({
        title: "✅ Ansluten till Shelly Fleet Manager!",
        description: "Nu får du realtidsdata från dina Shelly-enheter",
      });

    } catch (error) {
      console.error('SFM Connection error:', error);
      setConnectionStatus('error');
      setIsConnected(false);
      onConnectionChange?.(false);

      toast({
        title: "❌ Anslutning misslyckades",
        description: error instanceof Error ? error.message : "Kunde inte ansluta till Shelly Fleet Manager",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionStatus('disconnected');
    onConnectionChange?.(false);
    
    toast({
      title: "Frånkopplad",
      description: "Anslutning till Shelly Fleet Manager avslutad",
    });
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Ansluten</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Ansluter...</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Fel</Badge>;
      default:
        return <Badge variant="outline"><Wifi className="w-3 h-3 mr-1" />Frånkopplad</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Shelly Fleet Manager
            </CardTitle>
            <CardDescription>
              Anslut till Shelly Fleet Manager för realtidsdata från dina enheter
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="sfm-url">SFM Server URL</Label>
              <Input
                id="sfm-url"
                type="text"
                placeholder="wss://your-sfm-server.com"
                value={credentials.url}
                onChange={(e) => setCredentials({ ...credentials, url: e.target.value })}
                disabled={isConnecting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfm-username">Användarnamn</Label>
              <Input
                id="sfm-username"
                type="text"
                placeholder="Ditt SFM-användarnamn"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                disabled={isConnecting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfm-password">Lösenord</Label>
              <Input
                id="sfm-password"
                type="password"
                placeholder="Ditt SFM-lösenord"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                disabled={isConnecting}
              />
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ansluter...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Anslut till SFM
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Ansluten till Shelly Fleet Manager</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Tar emot realtidsdata från dina Shelly-enheter
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <span className="font-medium">Server:</span>
                <p className="text-muted-foreground">{credentials.url}</p>
              </div>
              <div className="text-sm">
                <span className="font-medium">Användare:</span>
                <p className="text-muted-foreground">{credentials.username}</p>
              </div>
            </div>

            <Button 
              onClick={handleDisconnect}
              variant="outline"
              className="w-full"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Koppla från SFM
            </Button>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Shelly Fleet Manager ger dig realtidsdata direkt från Shelly Cloud. 
            Detta säkerställer snabb och tillförlitlig brandlarmsdetektion.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShellyFleetManager;