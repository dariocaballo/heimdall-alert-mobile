import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShellyFleetManagerProps {
  userCode: string;
  onConnectionChange?: (connected: boolean) => void;
}

interface SFMCredentials {
  server: string;
  username: string;
  password: string;
}

export const ShellyFleetManager = ({ userCode, onConnectionChange }: ShellyFleetManagerProps) => {
  const [credentials, setCredentials] = useState<SFMCredentials>({
    server: '',
    username: '',
    password: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [statusMessage, setStatusMessage] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const { toast } = useToast();

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [userCode]);

  const checkConnectionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sfm_credentials')
        .select('*')
        .eq('user_code', userCode)
        .single();

      if (data && !error) {
        setIsConnected(true);
        setConnectionStatus('connected');
        setStatusMessage('Ansluten till Shelly Fleet Manager');
        setCredentials({
          server: data.sfm_url,
          username: 'Connected',
          password: '••••••••'
        });
        onConnectionChange?.(true);
      }
    } catch (error) {
      console.log('No existing SFM connection found');
    }
  };

  const handleConnect = async () => {
    if (!credentials.server || !credentials.username || !credentials.password) {
      toast({
        title: "Ofullständig information",
        description: "Vänligen fyll i alla fält",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');
    setStatusMessage('Ansluter till Shelly Fleet Manager...');

    try {
      // Authenticate with SFM
      const { data: authData, error: authError } = await supabase.functions.invoke(
        'shelly_fleet_manager',
        {
          body: {
            action: 'authenticate',
            userCode,
            credentials
          }
        }
      );

      if (authError || !authData?.success) {
        throw new Error(authData?.error || 'Autentisering misslyckades');
      }

      // Start WebSocket subscription
      const { data: subscribeData, error: subscribeError } = await supabase.functions.invoke(
        'shelly_fleet_manager',
        {
          body: {
            action: 'subscribe',
            userCode
          }
        }
      );

      if (subscribeError || !subscribeData?.success) {
        throw new Error(subscribeData?.error || 'WebSocket-anslutning misslyckades');
      }

      setIsConnected(true);
      setConnectionStatus('connected');
      setStatusMessage('Ansluten och mottar realtidsdata');
      onConnectionChange?.(true);

      toast({
        title: "✅ Anslutning lyckades!",
        description: "Nu mottar du realtidsdata från dina Shelly-enheter",
      });

    } catch (error) {
      console.error('SFM connection error:', error);
      setConnectionStatus('error');
      setStatusMessage(`Anslutningsfel: ${error instanceof Error ? error.message : 'Okänt fel'}`);
      
      toast({
        title: "❌ Anslutning misslyckades",
        description: error instanceof Error ? error.message : 'Kunde inte ansluta till Fleet Manager',
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setStatusMessage('');
    setCredentials({ server: '', username: '', password: '' });
    setDevices([]);
    onConnectionChange?.(false);
    
    toast({
      title: "Frånkopplad",
      description: "Du är nu frånkopplad från Fleet Manager",
    });
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ansluten</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Ansluter...</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Fel</Badge>;
      default:
        return <Badge variant="outline"><WifiOff className="w-3 h-3 mr-1" />Frånkopplad</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Shelly Fleet Manager
            </CardTitle>
            <CardDescription>
              Anslut till din Shelly Fleet Manager för realtidsövervakning
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sfm-server">Server URL</Label>
                <Input
                  id="sfm-server"
                  type="url"
                  placeholder="wss://shellyfl-t7-eu.shelly.cloud"
                  value={credentials.server}
                  onChange={(e) => setCredentials({ ...credentials, server: e.target.value })}
                  disabled={isConnecting}
                />
                <p className="text-xs text-muted-foreground">
                  Standard: wss://shellyfl-t7-eu.shelly.cloud (eller din egen on-prem URL)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sfm-username">Användarnamn</Label>
                <Input
                  id="sfm-username"
                  type="text"
                  placeholder="admin"
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
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  disabled={isConnecting}
                />
              </div>
            </div>

            <Alert>
              <Wifi className="h-4 w-4" />
              <AlertDescription>
                <strong>Om Shelly Fleet Manager:</strong>
                <br />
                Fleet Manager ger dig centraliserad kontroll över alla dina Shelly-enheter med realtidsdata, 
                schemaläggning och avancerad automatisering. Du kan använda både Shelly Cloud eller din egen on-premises installation.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleConnect}
              disabled={!credentials.server || !credentials.username || !credentials.password || isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ansluter...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Anslut till Fleet Manager
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Anslutningsstatus:</span>
                {getStatusBadge()}
              </div>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Server: {credentials.server}
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                className="flex-1"
              >
                <WifiOff className="w-4 h-4 mr-2" />
                Koppla från
              </Button>
            </div>
          </div>
        )}

        {statusMessage && connectionStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {statusMessage}
              <br />
              <br />
              <strong>Kontrollera:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Server URL är korrekt och tillgänglig</li>
                <li>• Användarnamn och lösenord är rätt</li>
                <li>• Fleet Manager körs och accepterar anslutningar</li>
                <li>• Nätverksanslutning fungerar</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};