import { useState, useEffect } from "react";
import { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';
import { Bluetooth, BluetoothConnected, Wifi, Shield, AlertTriangle, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';

interface BluetoothDeviceScannerProps {
  onDeviceSelected: (device: any) => void;
  isScanning: boolean;
  onScanningChange: (scanning: boolean) => void;
}

const BluetoothDeviceScanner = ({ onDeviceSelected, isScanning, onScanningChange }: BluetoothDeviceScannerProps) => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<ScanResult[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { toast } = useToast();

  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNativeApp) {
      checkBluetoothStatus();
    }
  }, [isNativeApp]);

  const checkBluetoothStatus = async () => {
    try {
      // Initialize BLE client
      await BleClient.initialize();
      
      // Check if Bluetooth is enabled
      const enabled = await BleClient.isEnabled();
      setBluetoothEnabled(enabled);
      
      if (!enabled) {
        toast({
          title: "Bluetooth krävs",
          description: "Aktivera Bluetooth för att söka efter Shelly-enheter",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Bluetooth status check failed:', error);
      toast({
        title: "Bluetooth-fel",
        description: "Kunde inte kontrollera Bluetooth-status",
        variant: "destructive",
      });
    }
  };

  const requestPermissions = async () => {
    try {
      // For Capacitor Bluetooth LE, permissions are typically handled automatically
      // when starting the scan. We'll set this to true and handle errors in the scan function.
      setPermissionGranted(true);
      toast({
        title: "Bluetooth redo",
        description: "Bluetooth-behörigheter kommer att begäras vid scanning",
      });
    } catch (error) {
      console.error('Permission setup failed:', error);
      toast({
        title: "Behörighetsfel",
        description: "Problem med Bluetooth-behörigheter",
        variant: "destructive",
      });
    }
  };

  const startBluetoothScan = async () => {
    if (!bluetoothEnabled) {
      toast({
        title: "Bluetooth inaktiverat",
        description: "Aktivera Bluetooth innan du söker efter enheter",
        variant: "destructive",
      });
      return;
    }

    if (!permissionGranted) {
      await requestPermissions();
      if (!permissionGranted) return;
    }

    onScanningChange(true);
    setDiscoveredDevices([]);

    try {
      toast({
        title: "Söker efter Shelly-enheter...",
        description: "Kontrollera att brandvarnaren är i Bluetooth-kopplingsläge",
      });

      await BleClient.requestLEScan(
        {
          services: [], // Sök efter alla enheter
          allowDuplicates: false,
        },
        (result) => {
          // Filter för Shelly-enheter baserat på namn
          const deviceName = result.device?.name || '';
          const isShelly = deviceName.toLowerCase().includes('shelly') || 
                          deviceName.toLowerCase().includes('smoke') ||
                          deviceName.toLowerCase().includes('plus');
          
          if (isShelly || deviceName) {
            setDiscoveredDevices(prev => {
              // Undvik dubbletter
              const exists = prev.find(d => d.device.deviceId === result.device.deviceId);
              if (!exists) {
                return [...prev, result];
              }
              return prev;
            });
          }
        }
      );

      // Stoppa scanning efter 15 sekunder
      setTimeout(async () => {
        await BleClient.stopLEScan();
        onScanningChange(false);
        
        if (discoveredDevices.length === 0) {
          toast({
            title: "Inga Shelly-enheter hittades",
            description: "Kontrollera att brandvarnaren är i kopplingsläge och försök igen",
            variant: "destructive",
          });
        } else {
          toast({
            title: `${discoveredDevices.length} enhet(er) upptäckt!`,
            description: "Välj en enhet för att fortsätta",
          });
        }
      }, 15000);

    } catch (error) {
      console.error('Bluetooth scan failed:', error);
      onScanningChange(false);
      toast({
        title: "Bluetooth-scanning misslyckades",
        description: "Kunde inte söka efter enheter via Bluetooth",
        variant: "destructive",
      });
    }
  };

  const stopBluetoothScan = async () => {
    try {
      await BleClient.stopLEScan();
      onScanningChange(false);
      toast({
        title: "Scanning stoppad",
        description: "Bluetooth-scanning har avbrutits",
      });
    } catch (error) {
      console.error('Failed to stop scan:', error);
    }
  };

  const selectBluetoothDevice = async (scanResult: ScanResult) => {
    try {
      // Skapa ett device-objekt som är kompatibelt med resten av appen
      const deviceData = {
        id: scanResult.device.deviceId,
        name: scanResult.device.name || 'Shelly Plus Smoke',
        type: 'SNSN-0031Z (Bluetooth)',
        rssi: scanResult.rssi,
        connectionType: 'bluetooth',
        bluetoothDevice: scanResult.device,
        status: 'Upptäckt via Bluetooth',
        batteryLevel: 100 // Kommer att uppdateras senare
      };

      onDeviceSelected(deviceData);
      
      toast({
        title: "Enhet vald",
        description: `${deviceData.name} har valts för installation`,
      });
    } catch (error) {
      console.error('Device selection failed:', error);
      toast({
        title: "Enhetsval misslyckades",
        description: "Kunde inte välja enheten",
        variant: "destructive",
      });
    }
  };

  const enableBluetooth = async () => {
    try {
      await BleClient.enable();
      setBluetoothEnabled(true);
      toast({
        title: "Bluetooth aktiverat",
        description: "Du kan nu söka efter enheter",
      });
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      toast({
        title: "Kunde inte aktivera Bluetooth",
        description: "Aktivera Bluetooth manuellt i systeminställningarna",
        variant: "destructive",
      });
    }
  };

  if (!isNativeApp) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Bluetooth-scanning kräver mobilapp:</strong> Bluetooth-funktionalitet är endast tillgänglig i mobilappen.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Bluetooth className="w-5 h-5" />
            <span>Bluetooth-scanning</span>
          </CardTitle>
          <CardDescription className="text-blue-600">
            Sök efter Shelly-enheter via Bluetooth LE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!bluetoothEnabled ? (
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Bluetooth inaktiverat:</strong> Aktivera Bluetooth för att fortsätta.
                </AlertDescription>
              </Alert>
              <Button onClick={enableBluetooth} className="w-full">
                <Bluetooth className="w-4 h-4 mr-2" />
                Aktivera Bluetooth
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-green-100 text-green-800">
                  <BluetoothConnected className="w-3 h-3 mr-1" />
                  Bluetooth aktiverat
                </Badge>
                <Button 
                  onClick={checkBluetoothStatus}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>

              <Alert>
                <Bluetooth className="h-4 w-4" />
                <AlertDescription>
                  <strong>Innan du söker:</strong>
                  <br />
                  Sätt brandvarnaren i Bluetooth-kopplingsläge enligt användarhandboken.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-2">
                {!isScanning ? (
                  <Button 
                    onClick={startBluetoothScan}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Sök via Bluetooth
                  </Button>
                ) : (
                  <Button 
                    onClick={stopBluetoothScan}
                    variant="outline"
                    className="flex-1"
                  >
                    <Search className="w-4 h-4 mr-2 animate-spin" />
                    Stoppa scanning
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Upptäckta Bluetooth-enheter */}
          {discoveredDevices.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-800">Bluetooth-enheter:</h4>
              {discoveredDevices
                .sort((a, b) => {
                  // Prioritera Shelly-enheter
                  const aIsShelly = (a.device?.name || '').toLowerCase().includes('shelly');
                  const bIsShelly = (b.device?.name || '').toLowerCase().includes('shelly');
                  if (aIsShelly && !bIsShelly) return -1;
                  if (!aIsShelly && bIsShelly) return 1;
                  // Sortera efter signalstyrka
                  return (b.rssi || -100) - (a.rssi || -100);
                })
                .map((scanResult) => {
                  const isShelly = (scanResult.device?.name || '').toLowerCase().includes('shelly');
                  return (
                    <Card 
                      key={scanResult.device.deviceId} 
                      className={`${isShelly ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              {isShelly ? (
                                <Shield className="w-8 h-8 text-red-600" />
                              ) : (
                                <Bluetooth className="w-8 h-8 text-blue-600" />
                              )}
                              {isShelly && (
                                <Badge className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-1">
                                  Shelly
                                </Badge>
                              )}
                            </div>
                            <div>
                              <h5 className="font-medium">
                                {scanResult.device?.name || 'Okänd enhet'}
                              </h5>
                              <p className="text-sm text-gray-600">
                                ID: {scanResult.device.deviceId}
                              </p>
                              <p className="text-xs text-gray-500">
                                Signal: {scanResult.rssi}dBm
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => selectBluetoothDevice(scanResult)}
                            size="sm"
                            className={isShelly ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                          >
                            Välj
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BluetoothDeviceScanner;