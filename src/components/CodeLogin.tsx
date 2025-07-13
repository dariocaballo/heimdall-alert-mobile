import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader } from "lucide-react";

interface CodeLoginProps {
  onLoginSuccess: (devices: string[], userCode: string) => void;
}

const CodeLogin = ({ onLoginSuccess }: CodeLoginProps) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const verifyCode = async () => {
    // Validate 6-character alphanumeric code
    if (!/^[A-Za-z0-9]{6}$/.test(code)) {
      toast({
        title: "Felaktig kod",
        description: "Koden måste vara exakt 6 tecken (bokstäver och/eller siffror)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const upperCode = code.toUpperCase();
      console.log('Verifying code directly against database:', code, 'Uppercase:', upperCode);
      
      // Check code directly against database instead of edge function
      const { data: codeData, error: codeError } = await supabase
        .from('user_codes')
        .select('user_code')
        .eq('user_code', upperCode)
        .single();

      console.log('Code check result:', { codeData, codeError });

      if (codeError || !codeData) {
        toast({
          title: "Ogiltig kod",
          description: "Koden kunde inte hittas. Kontrollera och försök igen.",
          variant: "destructive",
        });
        return;
      }

      // Get devices for this code
      const { data: devices, error: devicesError } = await supabase
        .from('user_devices')
        .select('device_id')
        .eq('user_code', upperCode);

      console.log('Devices result:', { devices, devicesError });

      if (devicesError) {
        console.error('Error fetching devices:', devicesError);
        toast({
          title: "Databasfel",
          description: "Kunde inte hämta enheter från databasen.",
          variant: "destructive",
        });
        return;
      }

      const deviceIds = devices?.map(d => d.device_id) || [];
      
      // Save user info to localStorage
      localStorage.setItem('user_code', upperCode);
      localStorage.setItem('user_devices', JSON.stringify(deviceIds));
      
      toast({
        title: "Inloggning lyckad!",
        description: `${deviceIds.length} brandvarnare hittade`,
      });
      
      onLoginSuccess(deviceIds, upperCode);
      
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till databasen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-blue-600">ID-Bevakarna</CardTitle>
          <CardDescription>
            Ange din 6-teckniga kod för att komma åt dina brandvarnare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Din 6-teckniga kod
              </label>
              <Input
                type="text"
                inputMode="text"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); // Only alphanumeric
                  if (value.length <= 6) {
                    setCode(value);
                  }
                }}
                placeholder="ABC123"
                className="text-center text-2xl font-mono tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-1">
                Bokstäver och siffror tillåtna
              </p>
            </div>
          </div>
          
          <Button 
            onClick={verifyCode}
            disabled={!/^[A-Za-z0-9]{6}$/.test(code) || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Verifierar...
              </>
            ) : (
              'Logga in'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeLogin;