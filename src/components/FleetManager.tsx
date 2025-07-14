import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Building, MapPin, Plus, Search, Filter, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FleetLocation {
  id: string;
  name: string;
  address: string;
  deviceCount: number;
  activeAlarms: number;
  status: 'online' | 'offline' | 'warning';
}

interface FleetManagerProps {
  userCode: string;
}

const FleetManager = ({ userCode }: FleetManagerProps) => {
  const [locations, setLocations] = useState<FleetLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulerad data för fleet manager
    setLocations([
      {
        id: "1",
        name: "Huvudkontor Stockholm",
        address: "Kungsgatan 1, Stockholm",
        deviceCount: 12,
        activeAlarms: 0,
        status: 'online'
      },
      {
        id: "2", 
        name: "Lager Göteborg",
        address: "Industrigatan 15, Göteborg",
        deviceCount: 8,
        activeAlarms: 1,
        status: 'warning'
      },
      {
        id: "3",
        name: "Filial Malmö",
        address: "Storgatan 22, Malmö",
        deviceCount: 6,
        activeAlarms: 0,
        status: 'online'
      }
    ]);
    setIsLoading(false);
  }, [userCode]);

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800 border-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'offline': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Alla enheter OK';
      case 'warning': return 'Kräver uppmärksamhet';
      case 'offline': return 'Offline';
      default: return 'Okänd status';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Fleet Manager</span>
            </CardTitle>
            <CardDescription>Laddar lokationer...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Fleet Manager</span>
          </CardTitle>
          <CardDescription>
            Hantera och övervaka alla dina lokationer från en central plats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Sök lokationer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Lägg till lokal</span>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map((location) => (
              <Card key={location.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Building className="w-5 h-5 text-primary" />
                        <span>{location.name}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center space-x-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{location.address}</span>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(location.status)}>
                      {getStatusText(location.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Brandvarnare</p>
                      <p className="font-semibold text-lg">{location.deviceCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Aktiva larm</p>
                      <p className={`font-semibold text-lg ${location.activeAlarms > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {location.activeAlarms}
                      </p>
                    </div>
                  </div>
                  
                  {location.activeAlarms > 0 && (
                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {location.activeAlarms} aktiva larm kräver omedelbar uppmärksamhet!
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Visa detaljer
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Hantera
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLocations.length === 0 && (
            <div className="text-center py-8">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Inga lokationer hittades</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Försök med andra söktermer' : 'Lägg till din första lokal för att komma igång'}
              </p>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Lägg till lokal</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Om Fleet Manager</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Centraliserad övervakning</strong> - Se alla dina lokationer på ett ställe</li>
            <li>• <strong>Snabb åtgärd</strong> - Identifiera och hantera problem omedelbart</li>
            <li>• <strong>Skalbar lösning</strong> - Lägg till obegränsat antal lokationer</li>
            <li>• <strong>Detaljerad rapportering</strong> - Fullständig historik och analys</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetManager;