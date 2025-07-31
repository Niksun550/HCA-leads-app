
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Task, TaskPriority, TaskCategory } from "@/types";
import { addDays, format, startOfWeek, isSameDay } from 'date-fns';

import { LoaderCircle, CheckCircle, Clock, XCircle, ChevronUp, Briefcase, DollarSign, FileText, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import TaskForm from "@/components/tasks/task-form";

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
    High: <ChevronUp className="h-4 w-4 text-red-500" />,
    Medium: <div className="h-0.5 w-3 bg-yellow-500 rounded-full" />,
    Low: <div className="h-0.5 w-3 bg-green-500 rounded-full" />,
};

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
    'Visit': <Briefcase className="h-4 w-4 text-blue-500" />,
    'Payment Collection': <DollarSign className="h-4 w-4 text-green-500" />,
    'Quotation': <FileText className="h-4 w-4 text-purple-500" />,
    'Follow-up': <Phone className="h-4 w-4 text-orange-500" />,
    'Other': <Clock className="h-4 w-4 text-gray-500" />,
};

export default function PlannerPage() {
    const { user, isInitialized } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekDates, setWeekDates] = useState<Date[]>([]);
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const dates = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
        setWeekDates(dates);
    }, []);

    useEffect(() => {
        if (!isInitialized || !user || weekDates.length === 0) {
            if (isInitialized) setLoading(false);
            return;
        }

        const { db } = getFirebaseServices();
        if (!db) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const startOfWeekDate = Timestamp.fromDate(weekDates[0]);
        const endOfWeekDate = Timestamp.fromDate(addDays(weekDates[6], 1));

        const tasksQuery = query(
            collection(db, 'tasks'), 
            where('assigneeId', '==', user.uid),
            where('dueDate', '>=', startOfWeekDate),
            where('dueDate', '<', endOfWeekDate)
        );

        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false);
        });

        return () => unsubscribeTasks();
    }, [user, isInitialized, weekDates]);
    
    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsTaskFormOpen(true);
    };

    if (!isInitialized || loading || !user) {
        return (
            <div className="flex h-[calc(100vh-theme(spacing.16))] w-full items-center justify-center bg-background">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="py-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Weekly Planner</h1>
                <p className="text-muted-foreground">Your tasks for the week of {weekDates.length > 0 ? format(weekDates[0], 'MMMM do') : ''}.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-start">
                {weekDates.map(date => {
                    const tasksForDay = tasks.filter(task => isSameDay(task.dueDate.toDate(), date));
                    return (
                        <div key={date.toISOString()} className="bg-muted/50 rounded-lg p-3">
                            <h3 className="font-semibold text-center mb-2">{format(date, 'EEE')}</h3>
                            <h4 className="text-xl font-bold text-center mb-4">{format(date, 'd')}</h4>
                            <div className="space-y-2 min-h-[100px]">
                                {tasksForDay.map(task => (
                                    <Card 
                                        key={task.id} 
                                        className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => handleTaskClick(task)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between">
                                                <p className="font-medium text-sm break-words">{task.title}</p>
                                                <div className="shrink-0 ml-2">
                                                    {priorityIcons[task.priority]}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <Badge variant="secondary" className="gap-1.5 pl-1.5">
                                                    {categoryIcons[task.category]}
                                                    {task.category}
                                                </Badge>
                                                {task.status === "Done" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {tasksForDay.length === 0 && <div className="text-center text-xs text-muted-foreground pt-8">No tasks</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* The TaskForm dialog is not rendered directly here, but it can be opened from this page.
                We need a way to open it without it being tied to a specific lead.
                For now, editing a task opens the form. Adding a new task for a specific day can be a future feature.
            */}
             <TaskForm
                isOpen={isTaskFormOpen}
                setIsOpen={setIsTaskFormOpen}
                task={selectedTask}
                users={[]} // Users and leads are not needed when just viewing/editing from planner
                leads={[]}
            />
        </div>
    );
}
