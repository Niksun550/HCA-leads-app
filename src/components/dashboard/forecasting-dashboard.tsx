
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { Lead } from '@/types';
import { TrendingUp, Target, Clock, DollarSign } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

interface ForecastingDashboardProps {
  leads: Lead[];
}

// Assuming a placeholder value, e.g., $3 per KW. 
// In a real app, this would likely come from settings or a database.
const REVENUE_PER_KW = 3000; 

export function ForecastingDashboard({ leads }: ForecastingDashboardProps) {
  const forecastData = useMemo(() => {
    const closedLeads = leads.filter(lead => lead.status === 'Closed');
    const droppedLeads = leads.filter(lead => lead.status === 'Dropped');
    const openLeads = leads.filter(lead => lead.status !== 'Closed' && lead.status !== 'Dropped');

    const totalClosed = closedLeads.length;
    const totalDropped = droppedLeads.length;
    const totalResolved = totalClosed + totalDropped;

    const winRate = totalResolved > 0 ? (totalClosed / totalResolved) * 100 : 0;

    const totalKwOfOpenLeads = openLeads.reduce((acc, lead) => acc + (lead.kwRequirement || 0), 0);
    const projectedRevenue = totalKwOfOpenLeads * REVENUE_PER_KW;
    
    const dealCycleDays = closedLeads.reduce((acc, lead) => {
        if (lead.createdAt && lead.closedAt) {
            return acc + differenceInDays(lead.closedAt.toDate(), lead.createdAt.toDate());
        }
        return acc;
    }, 0);
    const averageDealCycle = totalClosed > 0 ? Math.round(dealCycleDays / totalClosed) : 0;

    return {
      winRate,
      projectedRevenue,
      averageDealCycle,
    };
  }, [leads]);
  
  const monthlyData = useMemo(() => {
    const monthlySummary: { [key: string]: { created: number, closed: number } } = {};
    
    leads.forEach(lead => {
      const month = format(lead.createdAt.toDate(), 'yyyy-MM');
      if (!monthlySummary[month]) {
        monthlySummary[month] = { created: 0, closed: 0 };
      }
      monthlySummary[month].created += lead.kwRequirement || 0;
      if (lead.status === 'Closed' && lead.closedAt) {
          const closedMonth = format(lead.closedAt.toDate(), 'yyyy-MM');
           if (!monthlySummary[closedMonth]) {
            monthlySummary[closedMonth] = { created: 0, closed: 0 };
          }
          monthlySummary[closedMonth].closed += lead.kwRequirement || 0;
      }
    });

    return Object.entries(monthlySummary)
      .map(([month, data]) => ({ name: format(new Date(month), 'MMM yy'), ...data }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  }, [leads]);

  const stats = [
    { title: 'Projected Revenue', value: `$${forecastData.projectedRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', description: "From open leads" },
    { title: 'Win Rate', value: `${forecastData.winRate.toFixed(1)}%`, icon: Target, color: 'text-primary', description: "Of all resolved leads" },
    { title: 'Avg. Deal Cycle', value: `${forecastData.averageDealCycle} days`, icon: Clock, color: 'text-accent', description: "From creation to close" },
    { title: 'Pipeline Size (KW)', value: `${leads.reduce((acc, lead) => acc + (lead.kwRequirement || 0), 0).toLocaleString()} KW`, icon: TrendingUp, color: 'text-yellow-500', description: "Total KW in pipeline" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
            <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 text-muted-foreground ${stat.color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
            </Card>
        ))}
      </div>
       <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 h-full">
        <CardHeader>
          <CardTitle>Monthly Pipeline (KW)</CardTitle>
          <CardDescription>Total KW of leads created vs. closed each month.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                label={{ value: 'KW', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: 12, fill: '#888888' } }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "14px" }}/>
              <Bar dataKey="created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="KW Created" />
              <Bar dataKey="closed" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="KW Closed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
