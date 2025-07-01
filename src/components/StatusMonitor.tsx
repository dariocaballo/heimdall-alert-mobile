
import { useState, useEffect } from "react";
import { Wifi, Battery, Signal, Thermometer, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeviceStatus {
  deviceId: string;
  isOnline: boolean;
  lastSeen: Date;
  batteryLevel: number;
  signalStrength: number;
  temperature: number;
  humidity: number;
  firmwareVersion: string;
  uptime: number;
}

const StatusMonitor = () => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDeviceStatus();
    const interval = setInterval(loadDeviceStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDeviceStatus = async () => {
    setIsLoading(true);
    
    // Simulate API call to get device status
    setTimeout(() => {
      const mockStatus: DeviceStatus = {
        deviceId: 'shelly_001',
        isOnline: true,
        lastSeen: new Date(),
        batteryLevel: 85,
        signalStrength: 78,
        temperature: 22.5,
        humidity: 45,
        firmwareVersion: '1.0.10',
        uptime: 720 // hours
      };
      
      setDeviceStatus(mockStatus);
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1000);
  };

  const getSignalQuality = (strength: number) => {
    if (strength >= 80) return { label: 'Utmärkt', color: 'text-green-600' };
    if (strength >= 60) return { label: 'Bra', color: 'text-blue-600' };
    if (strength >= 40) return { label: 'Medel', color: 'text-yellow-600' };
    return { label: 'Svag', color: 'text-red-600' };
  };

  const getBatteryStatus = (level: number) => {
    if (level >= 80) return { label: 'Hög', color: 'text-green-600' };
    if (level >= 50) return { label: 'Medel', color: 'text-yellow-600' };
    if (level >= 20) return { label: 'Låg', color: 'text-orange-600' };
    return { label: 'Kritisk', color: 'text-red-600' };
  };

  const formatUptime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} dagar, ${remainingHours} timmar`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Enhetsstatus</span>
              </CardTitle>
              <CardDescription>
                Realtidsövervakning av din Shelly Plus Smoke brandvarnare
              </CardDescription>
            </div>
            <Button 
              onClick={loadDeviceStatus}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {deviceStatus ? (
        <>
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anslutningsstatus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={deviceStatus.isOnline ? "default" : "destructive"}>
                      {deviceStatus.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enhet ID:</span>
                    <span className="text-sm font-mono">{deviceStatus.deviceId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Senast sedd:</span>
                    <span className="text-sm">{deviceStatus.lastSeen.toLocaleString('sv-SE')}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Firmware:</span>
                    <span className="text-sm font-mono">{deviceStatus.firmwareVersion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Drifttid:</span>
                    <span className="text-sm">{formatUptime(deviceStatus.uptime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uppdaterad:</span>
                    <span className="text-sm">{lastUpdated.toLocaleTimeString('sv-SE')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Battery Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Battery className="w-5 h-5" />
                  <span>Batteristatus</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Batterinivå</span>
                    <span className={`font-medium ${getBatteryStatus(deviceStatus.batteryLevel).color}`}>
                      {getBatteryStatus(deviceStatus.batteryLevel).label}
                    </span>
                  </div>
                  <Progress value={deviceStatus.batteryLevel} className="h-2" />
                  <p className="text-xs text-gray-500 text-center">
                    {deviceStatus.batteryLevel}%
                  </p>
                </div>
                
                {deviceStatus.batteryLevel < 20 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Batterinivån är låg. Byt batteri inom kort för att säkerställa kontinuerlig övervakning.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Signal Strength */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Signal className="w-5 h-5" />
                  <span>Signalstyrka</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>WiFi-signal</span>
                    <span className={`font-medium ${getSignalQuality(deviceStatus.signalStrength).color}`}>
                      {getSignalQuality(deviceStatus.signalStrength).label}
                    </span>
                  </div>
                  <Progress value={deviceStatus.signalStrength} className="h-2" />
                  <p className="text-xs text-gray-500 text-center">
                    {deviceStatus.signalStrength}%
                  </p>
                </div>
                
                {deviceStatus.signalStrength < 40 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Svag WiFi-signal kan påverka larmfunktionen. Överväg att förbättra nätverkstäckningen.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Environmental Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Thermometer className="w-5 h-5" />
                <span>Miljödata</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-blue-600">
                    {deviceStatus.temperature}°C
                  </div>
                  <p className="text-sm text-gray-600">Temperatur</p>
                  <p className="text-xs text-gray-500">Normal: 15-30°C</p>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    {deviceStatus.humidity}%
                  </div>
                  <p className="text-sm text-gray-600">Luftfuktighet</p>
                  <p className="text-xs text-gray-500">Normal: 30-60%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Systemdiagnostik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Rökdetektor</span>
                  </div>
                  <span className="text-sm text-green-600">Fungerar</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Temperatursensor</span>
                  </div>
                  <span className="text-sm text-green-600">Fungerar</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">WiFi-anslutning</span>
                  </div>
                  <span className="text-sm text-green-600">Stabil</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Larmfunktion</span>
                  </div>
                  <span className="text-sm text-green-600">Redo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 space-y-4">
              <Wifi className="w-12 h-12 mx-auto" />
              <div>
                <p className="text-lg font-medium">Ingen enhet ansluten</p>
                <p className="text-sm">Anslut en Shelly Plus Smoke för att se status</p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Uppdatera sidan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatusMonitor;
