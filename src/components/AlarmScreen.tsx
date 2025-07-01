
import { useEffect, useState } from "react";
import { AlertTriangle, Phone, Clock, Calendar, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AlarmScreenProps {
  alarmData: {
    timestamp: Date;
    deviceId: string;
    location?: string;
  };
  onDismiss: () => void;
}

const AlarmScreen = ({ alarmData, onDismiss }: AlarmScreenProps) => {
  const [isFlashing, setIsFlashing] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    // Starta vibration om tillgängligt
    if ('vibrate' in navigator) {
      const vibrationPattern = [500, 300, 500, 300, 500];
      navigator.vibrate(vibrationPattern);
      
      // Fortsätt vibrera var 3:e sekund
      const vibrationInterval = setInterval(() => {
        navigator.vibrate(vibrationPattern);
      }, 3000);

      return () => clearInterval(vibrationInterval);
    }
  }, []);

  useEffect(() => {
    // Blinkande effekt
    const flashInterval = setInterval(() => {
      setIsFlashing(prev => !prev);
    }, 500);

    return () => clearInterval(flashInterval);
  }, []);

  const callEmergency = () => {
    window.location.href = 'tel:112';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`fixed inset-0 z-50 bg-red-600 ${isFlashing ? 'opacity-100' : 'opacity-90'} transition-opacity duration-500`}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border-4 border-red-800 shadow-2xl">
          <CardHeader className="text-center relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="flex justify-center mb-4">
              <div className={`w-20 h-20 rounded-full bg-red-600 flex items-center justify-center ${isFlashing ? 'animate-pulse' : ''}`}>
                <AlertTriangle className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold text-red-800 mb-2">
              🚨 BRANDLARM!
            </CardTitle>
            
            <Badge variant="destructive" className="text-lg px-4 py-2">
              OMEDELBAR ÅTGÄRD KRÄVS
            </Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Larm Information */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Larmtid</p>
                    <p className="font-semibold text-lg">{formatTime(alarmData.timestamp)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Datum</p>
                    <p className="font-semibold">{formatDate(alarmData.timestamp)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Enhet</p>
                    <p className="font-semibold">{alarmData.deviceId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Säkerhetsanvisningar */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">Säkerhetsanvisningar:</h3>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Kontrollera området för rök eller eld</li>
                <li>• Varsko alla personer i byggnaden</li>
                <li>• Lämna byggnaden om nödvändigt</li>
                <li>• Ring 112 vid verklig fara</li>
              </ul>
            </div>

            {/* Åtgärdsknappar */}
            <div className="space-y-3">
              <Button 
                onClick={callEmergency}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-6"
                size="lg"
              >
                <Phone className="w-5 h-5 mr-2" />
                Ring 112 - SOS Alarm
              </Button>
              
              <Button 
                onClick={onDismiss}
                variant="outline"
                className="w-full border-red-300 text-red-700 hover:bg-red-50"
                size="lg"
              >
                Falskt larm - Stäng av
              </Button>
            </div>

            {/* Tidsstämpel */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t">
              Larm mottaget: {alarmData.timestamp.toLocaleString('sv-SE')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlarmScreen;
