
"use client";

import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Lead } from "@/types";
import { useMemo } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";


interface LeadsMapProps {
  leads: Lead[];
}

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const LeadsMap = ({ leads }: LeadsMapProps) => {
  const markers = useMemo(() => leads.filter(lead => lead.location), [leads]);
  
  const center = useMemo(() => {
    if (markers.length === 0) {
      return { lat: 28.6139, lng: 77.2090 }; // Default to Delhi, India
    }
    const { lat, lng } = markers.reduce(
      (acc, marker) => {
        if(marker.location){
            acc.lat += marker.location.latitude;
            acc.lng += marker.location.longitude;
        }
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return { lat: lat / markers.length, lng: lng / markers.length };
  }, [markers]);

  if (!apiKey) {
    return (
      <Card className="shadow-sm h-full flex flex-col">
        <CardHeader>
          <CardTitle>Lead Locations</CardTitle>
          <CardDescription>A map of all leads with location data.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <Alert variant="destructive" className="w-full">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Google Maps Configuration Error</AlertTitle>
              <AlertDescription>
                The Google Maps API key is missing. Please add your key to a 
                 <code className="font-mono text-xs bg-muted p-1 rounded-sm">.env.local</code> file.
                 <Link href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" className="block text-xs underline mt-2">
                    Get your API Key from Google Cloud Console
                 </Link>
              </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm h-full">
      <CardHeader>
        <CardTitle>Lead Locations</CardTitle>
        <CardDescription>A map of all leads with location data.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] w-full p-0 rounded-b-lg overflow-hidden">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={5}
            gestureHandling={"greedy"}
            disableDefaultUI={true}
            mapId="hca_solar_crm_map"
          >
            {markers.map((lead) => (
                lead.location &&
              <Marker
                key={lead.id}
                position={{ lat: lead.location.latitude, lng: lead.location.longitude }}
                title={lead.customerName}
              />
            ))}
          </Map>
        </APIProvider>
      </CardContent>
    </Card>
  );
};

export default LeadsMap;
