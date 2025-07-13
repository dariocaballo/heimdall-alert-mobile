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
      console.log('Calling verify_user_code with code:', code);
      console.log('Supabase client config check');
      
      // Test med explicit URL om det behövs
      const response = await supabase.functions.invoke('verify_user_code', {
        body: { code: code }
      });
      
      console.log('Full response from edge function:', response);
      const { data, error } = response;

      if (error) {
        console.error('Edge function error details:', error);
        toast({
          title: "Anslutningsfel", 
          description: `Fel: ${error.message || 'Kunde inte ansluta till edge function'}`,
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.device_ids) {
        // Save user info to localStorage
        localStorage.setItem('user_code', code);
        localStorage.setItem('user_devices', JSON.stringify(data.device_ids));
        
        toast({
          title: "Inloggning lyckad!",
          description: `${data.device_ids.length} brandvarnare hittade`,
        });
        
        onLoginSuccess(data.device_ids, code);
      } else {
        toast({
          title: "Ogiltig kod",
          description: data?.error || "Koden kunde inte hittas. Kontrollera och försök igen.",
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