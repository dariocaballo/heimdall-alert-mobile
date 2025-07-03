
import { useState } from "react";
import { Wifi, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface ShellyConnectionHelperProps {
  shellyIP: string;
  onConnectionSuccess: () => void;
  onConnectionError: (error: string) => void;
}

export const ShellyConnectionHelper = ({ 
  shellyIP, 
  onConnectionSuccess, 
  onConnectionError 
}: ShellyConnectionHelperProps) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>("");
  const { toast } = useToast();

  const testShellyConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('testing');
    setErrorDetails("");

    try {
      console.log(`Testing connection to Shelly at ${shellyIP}`);
      
      // Test basic connectivity first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`http://${shellyIP}/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Shelly status response:', data);

      // Verify it's actually a Shelly device
      if (!data.device || !data.device.type) {
        throw new Error('Enheten svarar men verkar inte vara en Shelly-enhet');
      }

      setConnectionStatus('success');
      onConnectionSuccess();
      
      toast({
        title: "✅ Shelly funnen!",
        description: `Ansluten till ${data.device.hostname || data.device.type}`,
      });

    } catch (error) {
      console.error('Shelly connection error:', error);
      
      let errorMessage = "Okänt fel";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Timeout - enheten svarar inte inom 8 sekunder";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Kan inte nå enheten - kontrollera att du är ansluten till ShellyPlusSmoke-nätverket";
        } else {
          errorMessage = error.message;
        }
      }

      setConnectionStatus('failed');
      setErrorDetails(errorMessage);
      onConnectionError(errorMessage);
      
      toast({
        title: "❌ Anslutning misslyckades",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing':
        return 'Testar anslutning...';
      case 'success':
        return 'Anslutning lyckades!';
      case 'failed':
        return 'Anslutning misslyckades';
      default:
        return 'Redo att testa';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 p-4 border rounded-lg">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="font-medium">{getStatusText()}</p>
          <p className="text-sm text-gray-500">IP: {shellyIP}</p>
        </div>
      </div>

      {connectionStatus === 'failed' && errorDetails && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Fel:</strong> {errorDetails}
            <br />
            <br />
            <strong>Felsökning:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Kontrollera att telefonen är ansluten till "ShellyPlusSmoke-XXXXXX"</li>
              <li>• Kontrollera att brandvarnaren blinkar blått (konfigurationsläge)</li>
              <li>• Prova att hålla inne knappen på brandvarnaren i 10 sekunder igen</li>
              <li>• Starta om WiFi på telefonen</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={testShellyConnection}
        disabled={isTestingConnection}
        className="w-full"
        variant={connectionStatus === 'success' ? 'default' : 'outline'}
      >
        {isTestingConnection ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Testar anslutning...
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 mr-2" />
            {connectionStatus === 'success' ? 'Testa igen' : 'Testa anslutning till Shelly'}
          </>
        )}
      </Button>
    </div>
  );
};
