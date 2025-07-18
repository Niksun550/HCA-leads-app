
"use client";

import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/types";
import { useMemo } from "react";

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
      <Card className="shadow-sm h-full flex flex-col items-center justify-center">
        <CardHeader>
          <CardTitle>Lead Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center p-4">
            Google Maps API key is not configured.
            <br />
            Please create a `.env.local` file and add your key as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm h-full">
      <CardHeader>
        <CardTitle>Lead Locations</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full p-0">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={5}
            gestureHandling={"greedy"}
            disableDefaultUI={true}
            mapId="solar_leads_map"
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
