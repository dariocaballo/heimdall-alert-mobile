import { useState, useEffect } from "react";
import { Clock, Calendar, Shield, AlertTriangle, Trash2, Thermometer, Battery, Flame } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AlarmEvent {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  smoke: boolean;
  temperature?: number;
  battery?: boolean;
  type: string;
  location?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

interface AlarmHistoryProps {
  userCode: string;
}

const AlarmHistory = ({ userCode }: AlarmHistoryProps) => {
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAlarmHistory();
    
    // Set up real-time subscription for new alarms
    const channel = supabase
      .channel('alarm-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alarms',
          filter: `user_code=eq.${userCode}`
        },
        (payload) => {
          console.log('New alarm in history:', payload);
          loadAlarmHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userCode]);

  const loadAlarmHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get_alarm_history', {
        body: { user_code: userCode, limit: 50 }
      });

      if (error) {
        console.error('Error loading alarm history:', error);
        toast({
          title: "Fel vid hämtning",
          description: "Kunde inte hämta larmhistorik. Försök igen.",
          variant: "destructive",
        });
        return;
      }

      setAlarms(data?.alarms || []);
    } catch (error) {
      console.error('Error loading alarm history:', error);
      toast({
        title: "Nätverksfel",
        description: "Kunde inte ansluta till servern",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('sv-SE'),
      time: date.toLocaleTimeString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      full: `${date.toLocaleDateString('sv-SE')} ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`
    };
  };

  const getAlarmTypeColor = (alarm: AlarmEvent) => {
    if (alarm.type === 'test') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (alarm.smoke) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getAlarmTypeText = (alarm: AlarmEvent) => {
    if (alarm.type === 'test') {
      return 'Testlarm';
    }
    if (alarm.smoke) {
      return 'Rök upptäckt';
    }
    return 'Ingen rök';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Larmhistorik</span>
            </CardTitle>
            <CardDescription>Laddar historik...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            <Button
              variant="outline"
              size="sm"
              onClick={loadAlarmHistory}
              className="text-blue-600 hover:text-blue-700"
            >
              Uppdatera
            </Button>
          </div>
        </CardHeader>
      </Card>

      {alarms.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Inga larm ännu.</strong> Larm och tester kommer att visas här när de inträffar.
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
                <Card key={alarm.id} className={`border-l-4 ${alarm.smoke ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            alarm.smoke ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {alarm.smoke ? (
                              <Flame className="w-5 h-5 text-red-600" />
                            ) : (
                              <Shield className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <Badge className={getAlarmTypeColor(alarm)}>
                              {getAlarmTypeText(alarm)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              från {alarm.deviceName || alarm.deviceId}
                            </span>
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

                          <div className="flex items-center space-x-4 text-sm">
                            {alarm.temperature && (
                              <div className="flex items-center space-x-1">
                                <Thermometer className="w-4 h-4 text-gray-400" />
                                <span>{alarm.temperature}°C</span>
                              </div>
                            )}
                            {alarm.battery !== undefined && (
                              <div className="flex items-center space-x-1">
                                <Battery className="w-4 h-4 text-gray-400" />
                                <span>{alarm.battery ? 'OK' : 'Låg'}</span>
                              </div>
                            )}
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
            <li>• <strong>Rök upptäckt</strong> - Verkliga larm från brandvarnaren</li>
            <li>• <strong>Testlarm</strong> - Larm som utlösts för test</li>
            <li>• <strong>Data uppdateras</strong> - Historik hämtas från servern i realtid</li>
            <li>• <strong>Temperatur & batteri</strong> - Visas när tillgängligt</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlarmHistory;