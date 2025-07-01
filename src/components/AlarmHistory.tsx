
import { useState, useEffect } from "react";
import { Clock, Calendar, Shield, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface AlarmEvent {
  timestamp: Date;
  deviceId: string;
  location?: string;
  type?: string;
}

const AlarmHistory = () => {
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAlarmHistory();
  }, []);

  const loadAlarmHistory = () => {
    try {
      const savedAlarms = localStorage.getItem('alarm_history');
      if (savedAlarms) {
        const parsedAlarms = JSON.parse(savedAlarms).map((alarm: any) => ({
          ...alarm,
          timestamp: new Date(alarm.timestamp)
        }));
        setAlarms(parsedAlarms);
      }
    } catch (error) {
      console.error('Error loading alarm history:', error);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('alarm_history');
    setAlarms([]);
    toast({
      title: "Historik rensad",
      description: "All larmhistorik har tagits bort.",
    });
  };

  const formatDateTime = (date: Date) => {
    return {
      date: date.toLocaleDateString('sv-SE'),
      time: date.toLocaleTimeString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      full: date.toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getAlarmTypeColor = (alarm: AlarmEvent) => {
    if (alarm.type === 'test' || alarm.deviceId.includes('test')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getAlarmTypeText = (alarm: AlarmEvent) => {
    if (alarm.type === 'test' || alarm.deviceId.includes('test')) {
      return 'Testlarm';
    }
    return 'Brandlarm';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Larmhistorik</span>
              </CardTitle>
              <CardDescription>
                Visa alla tidigare larm och tester
              </CardDescription>
            </div>
            {alarms.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Rensa historik
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {alarms.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ingen historik tillgänglig.</strong> Larm och tester som körs kommer att visas här.
            Använd "Testa larm" på Dashboard för att verifiera att systemet fungerar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Totalt {alarms.length} händelse{alarms.length !== 1 ? 'r' : ''}
            </p>
          </div>

          <div className="space-y-3">
            {alarms.map((alarm, index) => {
              const dateTime = formatDateTime(alarm.timestamp);
              
              return (
                <Card key={index} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge className={getAlarmTypeColor(alarm)}>
                              {getAlarmTypeText(alarm)}
                            </Badge>
                            <span className="text-sm text-gray-500">från {alarm.deviceId}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{dateTime.date}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{dateTime.time}</span>
                            </div>
                          </div>

                          {alarm.location && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Shield className="w-4 h-4 text-gray-400" />
                              <span>{alarm.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right text-xs text-gray-400">
                        {index === 0 && <Badge variant="secondary" className="text-xs">Senaste</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Om larmhistoriken</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Testlarm</strong> - Larm som utlösts via "Testa larm"-knappen</li>
            <li>• <strong>Brandlarm</strong> - Verkliga larm från brandvarnaren</li>
            <li>• <strong>Historik sparas lokalt</strong> - Data försvinner om appen raderas</li>
            <li>• <strong>Automatisk rensning</strong> - Endast de senaste 50 händelserna behålls</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlarmHistory;
