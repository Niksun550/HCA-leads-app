
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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
    
    // Initialize all possible statuses to ensure they appear on the chart
    leadStatuses.forEach(status => {
      statusCounts[status] = 0;
    });

    // Count leads for each status
    leads.forEach(lead => {
      if (statusCounts[lead.status] !== undefined) {
        statusCounts[lead.status]++;
      }
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name, count: value }));
  }, [leads]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Leads by Status</CardTitle>
        <CardDescription>A summary of your current sales pipeline.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
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
