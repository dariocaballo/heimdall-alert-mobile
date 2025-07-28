import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, Loader } from "lucide-react";

interface SimpleCodeLoginProps {
  onLoginSuccess: (devices: string[], userCode: string) => void;
}

const SimpleCodeLogin = ({ onLoginSuccess }: SimpleCodeLoginProps) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Testkoder med enheter
  const validCodes = {
    'DEMO01': ['shelly-smoke-demo-01', 'shelly-smoke-demo-02', 'shelly-smoke-demo-03'],
    'TEST01': ['shelly-smoke-test-01', 'shelly-smoke-test-02'],
    'ABC123': ['shelly-smoke-abc-01'],
    'XYZ789': ['shelly-smoke-xyz-01']
  };

  const verifyCode = async () => {
    // Validera kod format
    if (!/^[A-Za-z0-9]{6}$/.test(code)) {
      toast.error("Koden måste vara exakt 6 tecken (bokstäver och/eller siffror)");
      return;
    }

    setIsLoading(true);
    console.log('Verifying code:', code);
    
    try {
      const upperCode = code.toUpperCase();
      console.log('Checking code:', upperCode);
      console.log('Valid codes:', Object.keys(validCodes));
      
      // Kontrollera om koden finns
      if (validCodes[upperCode as keyof typeof validCodes]) {
        const devices = validCodes[upperCode as keyof typeof validCodes];
        console.log('Code found! Devices:', devices);
        
        // Spara i localStorage
        localStorage.setItem('user_code', upperCode);
        localStorage.setItem('user_devices', JSON.stringify(devices));
        
        toast.success(`Inloggning lyckad! ${devices.length} brandvarnare hittade`);
        
        // Anropa success callback
        onLoginSuccess(devices, upperCode);
        return;
      }
      
      // Kod hittades inte
      toast.error("Ogiltig kod. Testa: DEMO01, TEST01, ABC123, XYZ789");
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Ett fel uppstod vid inloggning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyCode();
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
                onKeyPress={handleKeyPress}
                placeholder="DEMO01"
                className="text-center text-2xl font-mono tracking-widest"
                autoFocus
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
          
          <div className="text-center text-xs text-gray-500">
            <p>Tryck Enter för att logga in</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleCodeLogin;