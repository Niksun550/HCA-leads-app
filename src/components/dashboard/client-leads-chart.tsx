
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Lead } from '@/types';
import { useMemo } from 'react';
import { leadStatuses } from '@/types';

interface LeadsChartProps {
  leads: Lead[];
}

export default function LeadsChart({ leads }: LeadsChartProps) {
  const data = useMemo(() => {
    const statusCounts: { [key: string]: number } = {};
    
    leadStatuses.forEach(status => {
      statusCounts[status] = 0;
    });

    leads.forEach(lead => {
      if (statusCounts[lead.status] !== undefined) {
        statusCounts[lead.status]++;
      }
    });
    
    return Object.entries(statusCounts).map(([name, count]) => ({ name, count }));
  }, [leads]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Leads by Status</CardTitle>
        <CardDescription>A summary of your current sales pipeline.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                margin={{ top: 5, right: 20, bottom: 5, left: -10 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} interval={0} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "14px" }}/>
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Lead Count" />
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
