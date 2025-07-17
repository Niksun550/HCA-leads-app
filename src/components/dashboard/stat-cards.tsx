"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Lead } from '@/types';
import { BarChart, Users, Zap, CheckCircle } from 'lucide-react';

interface StatCardsProps {
  leads: Lead[];
}

export function StatCards({ leads }: StatCardsProps) {
  const totalLeads = leads.length;
  const totalKw = leads.reduce((acc, lead) => acc + (lead.kwRequirement || 0), 0);
  const closedLeads = leads.filter(lead => lead.status === 'Closed').length;
  const proposalSent = leads.filter(lead => lead.status === 'Proposal Sent').length;

  const stats = [
    { title: 'Total Leads', value: totalLeads, icon: Users, color: 'text-primary' },
    { title: 'Total KW Requirement', value: `${totalKw.toLocaleString()} KW`, icon: Zap, color: 'text-accent' },
    { title: 'Proposals Sent', value: proposalSent, icon: BarChart, color: 'text-yellow-500' },
    { title: 'Leads Closed', value: closedLeads, icon: CheckCircle, color: 'text-green-500' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-5 w-5 text-muted-foreground ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
