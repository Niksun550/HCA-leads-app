
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Task, AppUser, Lead } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, LoaderCircle } from "lucide-react";
import TaskForm from "@/components/tasks/task-form";
import { TasksTable } from "@/components/tasks/tasks-table";
import { useToast } from "@/hooks/use-toast";

export default function TasksPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [allLeads, setAllLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        if (isAuthLoading || !user) {
            if (!isAuthLoading) setLoading(false);
            return;
        }

        const { db } = getFirebaseServices();
        if (!db) {
            setLoading(false);
            return;
        }

        // Fetch all users for assignee dropdown
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => doc.data() as AppUser));
        });

        // Fetch leads assigned to the user for the "Related Lead" dropdown
        const leadsQuery = query(collection(db, 'leads'), where('ownerId', '==', user.uid));
        const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
            setAllLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
        }, (error) => {
            console.error("Error fetching leads for tasks:", error);
        });
        

        // Fetch tasks assigned to the current user ONLY
        const tasksQuery = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid));
        
        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            tasksData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setTasks(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            toast({ variant: 'destructive', title: "Error fetching tasks", description: error.message });
            setLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeLeads();
            unsubscribeTasks();
        };
    }, [user, isAuthLoading, toast]);

    const handleAddTask = () => {
        setSelectedTask(null);
        setIsFormOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setSelectedTask(task);
        setIsFormOpen(true);
    };

    const handleDeleteTask = async (taskId: string) => {
        const { db } = getFirebaseServices();
        if (!db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured.' });
            return;
        }
        try {
            await deleteDoc(doc(db, "tasks", taskId));
            toast({ title: "Task Deleted", description: "The task has been successfully deleted." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not delete the task." });
        }
    };

    if (isAuthLoading || loading || !user) {
        return (
            <div className="flex h-[calc(100vh-theme(spacing.16))] w-full items-center justify-center bg-background">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="py-4 space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Tasks</h1>
                    <p className="text-muted-foreground">Manage your daily tasks and priorities.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleAddTask} className="hidden sm:inline-flex">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Task
                    </Button>
                </div>
            </header>
            
            <TasksTable 
                tasks={tasks} 
                onEdit={handleEditTask} 
                onDelete={handleDeleteTask}
            />

            <Button 
                onClick={handleAddTask}
                className="sm:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
                size="icon"
            >
                <PlusCircle className="h-7 w-7" />
                <span className="sr-only">Add Task</span>
            </Button>

            <TaskForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                task={selectedTask}
                users={allUsers}
                leads={allLeads}
            />
        </div>
    );
}
