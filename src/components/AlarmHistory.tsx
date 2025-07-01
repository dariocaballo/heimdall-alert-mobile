
import { useState, useEffect } from "react";
import { Calendar, Clock, AlertTriangle, CheckCircle, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AlarmEvent {
  id: string;
  timestamp: Date;
  type: 'fire' | 'test' | 'low_battery' | 'maintenance';
  severity: 'high' | 'medium' | 'low';
  message: string;
  deviceId: string;
  resolved: boolean;
}

const AlarmHistory = () => {
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    // Load alarm history from localStorage or API
    const loadAlarmHistory = () => {
      const stored = localStorage.getItem('alarm_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAlarms(parsed.map((alarm: any) => ({
          ...alarm,
          timestamp: new Date(alarm.timestamp)
        })));
      } else {
        // Demo data
        const demoAlarms: AlarmEvent[] = [
          {
            id: '1',
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            type: 'test',
            severity: 'low',
            message: 'Testlarm genomfört framgångsrikt',
            deviceId: 'shelly_001',
            resolved: true
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 604800000), // 1 week ago
            type: 'maintenance',
            severity: 'medium',
            message: 'Månadsvis funktionstest utfört',
            deviceId: 'shelly_001',
            resolved: true
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 2592000000), // 1 month ago
            type: 'low_battery',
            severity: 'medium',
            message: 'Låg batterinivå - byte rekommenderas inom 30 dagar',
            deviceId: 'shelly_001',
            resolved: true
          }
        ];
        setAlarms(demoAlarms);
      }
    };

    loadAlarmHistory();
  }, []);

  const getAlarmIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'test':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'low_battery':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'maintenance':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlarmBadge = (type: string, severity: string) => {
    const variants = {
      fire: 'destructive',
      test: 'default',
      low_battery: 'secondary',
      maintenance: 'outline'
    };

    const labels = {
      fire: 'Brandlarm',
      test: 'Test',
      low_battery: 'Lågt batteri',
      maintenance: 'Underhåll'
    };

    return (
      <Badge variant={variants[type as keyof typeof variants] as any}>
        {labels[type as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredAlarms = alarms.filter(alarm => {
    if (filter === 'all') return true;
    return alarm.type === filter;
  });

  const sortedAlarms = [...filteredAlarms].sort((a, b) => {
    if (sortBy === 'newest') return b.timestamp.getTime() - a.timestamp.getTime();
    if (sortBy === 'oldest') return a.timestamp.getTime() - b.timestamp.getTime();
    if (sortBy === 'severity') {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Larmhistorik</span>
          </CardTitle>
          <CardDescription>
            Översikt över alla larm, tester och underhållsaktiviteter
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Filter:</span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla händelser</SelectItem>
                  <SelectItem value="fire">Brandlarm</SelectItem>
                  <SelectItem value="test">Testlarm</SelectItem>
                  <SelectItem value="low_battery">Lågt batteri</SelectItem>
                  <SelectItem value="maintenance">Underhåll</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Sortera:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Nyaste först</SelectItem>
                  <SelectItem value="oldest">Äldste först</SelectItem>
                  <SelectItem value="severity">Allvarlighetsgrad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-gray-600">Brandlarm</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{alarms.filter(a => a.type === 'test').length}</p>
                <p className="text-sm text-gray-600">Testlarm</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{alarms.filter(a => a.type === 'low_battery').length}</p>
                <p className="text-sm text-gray-600">Batterivarningar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{alarms.filter(a => a.type === 'maintenance').length}</p>
                <p className="text-sm text-gray-600">Underhåll</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alarm List */}
      <div className="space-y-3">
        {sortedAlarms.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 space-y-2">
                <Calendar className="w-12 h-12 mx-auto" />
                <p className="text-lg font-medium">Ingen historik tillgänglig</p>
                <p className="text-sm">Larm och händelser kommer att visas här</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedAlarms.map((alarm) => (
            <Card key={alarm.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">
                    {getAlarmIcon(alarm.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getAlarmBadge(alarm.type, alarm.severity)}
                        <span className="text-sm text-gray-500">
                          Enhet: {alarm.deviceId}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{alarm.timestamp.toLocaleString('sv-SE')}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{alarm.message}</p>
                    {alarm.resolved && (
                      <div className="flex items-center space-x-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Åtgärdat</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Export Button */}
      <Card>
        <CardContent className="p-4">
          <Button variant="outline" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Exportera historik
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlarmHistory;
