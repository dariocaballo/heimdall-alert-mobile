import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader } from "lucide-react";
import TestConnection from "./TestConnection";
import { useAuth } from "@/components/AuthProvider";

interface CodeLoginProps {
  onLoginSuccess: (devices: string[], userCode: string) => void;
}

const CodeLogin = ({ onLoginSuccess }: CodeLoginProps) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const { toast } = useToast();
  const { signUp, signIn } = useAuth();

  // Manuell lista med testdata som backup
  const manualTestCodes = {
    'DEMO01': ['shelly-smoke-demo-01', 'shelly-smoke-demo-02', 'shelly-smoke-demo-03'],
    'TEST01': ['shelly-smoke-test-01', 'shelly-smoke-test-02'],
    'ABC123': ['shelly-smoke-abc-01'],
    'XYZ789': ['shelly-smoke-xyz-01']
  };

  const verifyCodeManually = async (inputCode: string) => {
    const upperCode = inputCode.toUpperCase();
    console.log('Manual verification for code:', upperCode);
    
    if (manualTestCodes[upperCode as keyof typeof manualTestCodes]) {
      const devices = manualTestCodes[upperCode as keyof typeof manualTestCodes];
      console.log('Manual code found:', upperCode, 'devices:', devices);
      
      // Create or sign in user with Supabase auth
      const email = `${upperCode.toLowerCase()}@idbevakarna.local`;
      const password = `${upperCode}123456`;
      
      try {
        // Try to sign in first
        let authResult = await signIn(email, password);
        
        // If sign in fails, try to sign up
        if (authResult.error) {
          console.log('Manual: Sign in failed, trying sign up...');
          authResult = await signUp(email, password, upperCode);
        }
        
        if (!authResult.error) {
          // Spara i localStorage
          localStorage.setItem('user_code', upperCode);
          localStorage.setItem('user_devices', JSON.stringify(devices));
          
          toast({
            title: "Inloggning lyckad!",
            description: `${devices.length} brandvarnare hittade`,
          });
          
          onLoginSuccess(devices, upperCode);
          return true;
        }
      } catch (error) {
        console.error('Manual auth error:', error);
      }
    }
    return false;
  };

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
      console.log('Verifying code:', code, 'Uppercase:', upperCode);
      
      // Försök först med Supabase
      try {
        console.log('Trying Supabase verification...');
        
        const { data: codeData, error: codeError } = await supabase
          .from('user_codes')
          .select('user_code')
          .eq('user_code', upperCode)
          .single();

        console.log('Supabase code check result:', { codeData, codeError });

        if (!codeError && codeData) {
          // Get devices from Supabase
          const { data: devices, error: devicesError } = await supabase
            .from('user_devices')
            .select('device_id')
            .eq('user_code', upperCode);

          console.log('Supabase devices result:', { devices, devicesError });

          if (!devicesError && devices) {
            const deviceIds = devices.map(d => d.device_id);
            
            // Create or sign in user with Supabase auth
            const email = `${upperCode.toLowerCase()}@idbevakarna.local`;
            const password = `${upperCode}123456`;
            
            // Try to sign in first
            let authResult = await signIn(email, password);
            
            // If sign in fails, try to sign up
            if (authResult.error) {
              console.log('Sign in failed, trying sign up...');
              authResult = await signUp(email, password, upperCode);
            }
            
            if (!authResult.error) {
              localStorage.setItem('user_code', upperCode);
              localStorage.setItem('user_devices', JSON.stringify(deviceIds));
              
              toast({
                title: "Inloggning lyckad!",
                description: `${deviceIds.length} brandvarnare hittade`,
              });
              
              onLoginSuccess(deviceIds, upperCode);
              return;
            }
          }
        }
      } catch (supabaseError) {
        console.warn('Supabase verification failed:', supabaseError);
      }
      
      // Fallback till manuell verifiering
      console.log('Falling back to manual verification...');
      if (await verifyCodeManually(upperCode)) {
        return;
      }
      
      // Ingen kod hittades
      toast({
        title: "Ogiltig kod",
        description: "Koden kunde inte hittas. Testa: DEMO01, TEST01, ABC123, XYZ789",
        variant: "destructive",
      });
      
    } catch (error) {
      console.error('Verification error:', error);
      
      // Försök manuell verifiering som sista utväg
      if (await verifyCodeManually(code.toUpperCase())) {
        return;
      }
      
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till databasen, försökte manuell verifiering",
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
                  const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                  if (value.length <= 6) {
                    setCode(value);
                  }
                }}
                placeholder="DEMO01"
                className="text-center text-2xl font-mono tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-1">
                Testa: DEMO01, TEST01, ABC123, XYZ789
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
          
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTest(!showTest)}
            >
              {showTest ? 'Dölj Test' : 'Visa Anslutningstest'}
            </Button>
          </div>
          
          {showTest && <TestConnection />}
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeLogin;