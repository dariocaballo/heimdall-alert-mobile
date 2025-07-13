import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TestConnection = () => {
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testSupabaseConnection = async () => {
    setIsLoading(true);
    setTestResult("Testar anslutning...");
    
    try {
      console.log("Testing Supabase connection...");
      
      // Test 1: Basic connection
      const { data: testData, error: testError } = await supabase
        .from('user_codes')
        .select('user_code')
        .limit(5);
      
      console.log("Test result:", { testData, testError });
      
      if (testError) {
        setTestResult(`Fel: ${testError.message}`);
        return;
      }
      
      // Test 2: Check specific code
      const { data: demoData, error: demoError } = await supabase
        .from('user_codes')
        .select('user_code')
        .eq('user_code', 'DEMO01')
        .single();
      
      console.log("DEMO01 test:", { demoData, demoError });
      
      if (demoError) {
        setTestResult(`DEMO01 hittades inte: ${demoError.message}`);
        return;
      }
      
      // Test 3: Get devices for DEMO01
      const { data: devicesData, error: devicesError } = await supabase
        .from('user_devices')
        .select('device_id')
        .eq('user_code', 'DEMO01');
      
      console.log("Devices test:", { devicesData, devicesError });
      
      if (devicesError) {
        setTestResult(`Enheter hittades inte: ${devicesError.message}`);
        return;
      }
      
      setTestResult(`✅ Anslutning fungerar! 
Totalt koder: ${testData?.length || 0}
DEMO01: ${demoData ? 'Hittad' : 'Inte hittad'}  
Enheter för DEMO01: ${devicesData?.length || 0}`);
      
    } catch (error) {
      console.error("Connection test failed:", error);
      setTestResult(`❌ Anslutning misslyckades: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Test Supabase Anslutning</h3>
      <Button onClick={testSupabaseConnection} disabled={isLoading} className="mb-4">
        {isLoading ? "Testar..." : "Testa Anslutning"}
      </Button>
      {testResult && (
        <div className="p-3 bg-gray-100 rounded whitespace-pre-line">
          {testResult}
        </div>
      )}
    </div>
  );
};

export default TestConnection;