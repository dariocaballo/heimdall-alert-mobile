import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader } from "lucide-react";

interface CodeLoginProps {
  onLoginSuccess: (devices: string[]) => void;
}

const CodeLogin = ({ onLoginSuccess }: CodeLoginProps) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Felaktig kod",
        description: "Koden måste vara 6 tecken lång",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify_user_code', {
        body: { user_code: code.toUpperCase() }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Verifieringsfel",
          description: "Kunde inte verifiera koden. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.devices) {
        // Save devices to localStorage
        localStorage.setItem('user_code', code.toUpperCase());
        localStorage.setItem('user_devices', JSON.stringify(data.devices));
        
        toast({
          title: "Inloggning lyckad!",
          description: `${data.devices.length} brandvarnare hittade`,
        });
        
        onLoginSuccess(data.devices);
      } else {
        toast({
          title: "Ogiltig kod",
          description: "Koden kunde inte hittas. Kontrollera och försök igen.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till servern",
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
            Ange din 6-siffriga kod för att komma åt dina brandvarnare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Användarens kod
              </label>
              <InputOTP 
                maxLength={6} 
                value={code} 
                onChange={setCode}
                className="justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          
          <Button 
            onClick={verifyCode}
            disabled={code.length !== 6 || isLoading}
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