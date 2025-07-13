import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";

const FirebaseSetup = () => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Firebase Konfiguration Krävs
        </CardTitle>
        <CardDescription>
          För att få push-notifikationer måste Firebase konfigureras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Steg 1:</strong> Skapa ett Firebase-projekt på{" "}
            <a 
              href="https://console.firebase.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Firebase Console
            </a>
          </AlertDescription>
        </Alert>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Steg 2:</strong> Aktivera Cloud Messaging i Firebase-projektet
          </AlertDescription>
        </Alert>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Steg 3:</strong> Uppdatera konfigurationen i <code>src/config/firebase.ts</code> och <code>public/firebase-messaging-sw.js</code> med dina Firebase-inställningar
          </AlertDescription>
        </Alert>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Steg 4:</strong> Generera VAPID-nyckel i Firebase Console under Project Settings → Cloud Messaging
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Vad du behöver från Firebase:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>API Key</li>
            <li>Auth Domain</li>
            <li>Project ID</li>
            <li>Storage Bucket</li>
            <li>Messaging Sender ID</li>
            <li>App ID</li>
            <li>VAPID Key</li>
          </ul>
        </div>

        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Obs:</strong> Appen fungerar utan Firebase-konfiguration men använder då mock-tokens för utveckling. För produktionsanvändning krävs korrekt Firebase-setup.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FirebaseSetup;