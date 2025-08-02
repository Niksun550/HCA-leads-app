
"use client";

import { Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
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
            <ComposedChart
                layout="vertical"
                data={data}
                margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
                <CartesianGrid stroke="#f5f5f5" />
                <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" scale="band" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={110} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "14px" }}/>
                <Bar dataKey="count" barSize={20} fill="hsl(var(--primary))" name="Lead Count" />
            </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
