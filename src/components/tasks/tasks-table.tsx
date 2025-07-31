
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash2, Edit, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TasksTableProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
    High: <ChevronUp className="h-4 w-4 text-red-500" />,
    Medium: <div className="h-1 w-3 bg-yellow-500 rounded-full" />,
    Low: <ChevronDown className="h-4 w-4 text-green-500" />,
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
    "To Do": <Clock className="h-4 w-4 text-muted-foreground" />,
    "In Progress": <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
    "Done": <CheckCircle className="h-4 w-4 text-green-500" />,
    "Cancelled": <XCircle className="h-4 w-4 text-destructive" />,
};

const priorityBadgeVariant: Record<TaskPriority, "destructive" | "secondary" | "default"> = {
    High: "destructive",
    Medium: "secondary",
    Low: "default",
};

export function TasksTable({ tasks, onEdit, onDelete }: TasksTableProps) {
  const { user } = useAuth();
  
  if (tasks.length === 0) {
    return (
       <div className="rounded-lg border shadow-sm bg-card p-12 text-center text-muted-foreground">
          You have no tasks assigned. Create one to get started!
        </div>
    )
  }

  return (
    <div className="rounded-lg border shadow-sm bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Priority</TableHead>
            <TableHead className="hidden lg:table-cell">Due Date</TableHead>
            <TableHead className="hidden md:table-cell">Assignee</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                    {statusIcons[task.status]}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{task.title}</div>
                  {task.leadCustomerName && (
                    <div className="text-sm text-muted-foreground">
                        Lead: {task.leadCustomerName}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{task.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    <Badge variant={priorityBadgeVariant[task.priority]} className="gap-1 pl-1.5">
                        {priorityIcons[task.priority]}
                        {task.priority}
                    </Badge>
                </TableCell>
                <TableCell className={cn("hidden lg:table-cell", new Date(task.dueDate.seconds * 1000) < new Date() && task.status !== "Done" && "text-destructive")}>
                    {format(task.dueDate.toDate(), "PPP")}
                </TableCell>
                 <TableCell className="hidden md:table-cell">{task.assigneeName}</TableCell>
                <TableCell className="text-right">
                     <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(task)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(user?.uid === task.createdBy || user?.role === 'Admin') && (
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this task.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(task.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
