
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, deleteDoc, or } from 'firebase/firestore';
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Task, AppUser, Lead } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, LoaderCircle } from "lucide-react";
import TaskForm from "@/components/tasks/task-form";
import { TasksTable } from "@/components/tasks/tasks-table";
import { useToast } from "@/hooks/use-toast";
import { structureLeadStatuses } from "@/types";

export default function TasksPage() {
    const { user, isInitialized } = useAuth();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [allLeads, setAllLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        if (!isInitialized || !user) {
            if (isInitialized) setLoading(false);
            return;
        }

        const { db } = getFirebaseServices();
        if (!db) {
            setLoading(false);
            return;
        }

        // Fetch all users
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => doc.data() as AppUser));
        });

        // Fetch leads based on user role
        let leadsQuery;
        if (user.role === 'Admin' || user.role === 'Director') {
            leadsQuery = query(collection(db, 'leads'));
        } else if (user.role === 'Sales Rep') {
            leadsQuery = query(collection(db, 'leads'), where('ownerId', '==', user.uid));
        } else if (user.role === 'Structure') {
             leadsQuery = query(collection(db, 'leads'), or(
                where('structureTeamMemberId', '==', user.uid),
                where('status', 'in', structureLeadStatuses)
            ));
        } else {
            leadsQuery = query(collection(db, 'leads'), where('ownerId', '==', 'invalid_user_id')); // No leads for others
        }
        
        const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
            setAllLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
        }, (error) => {
             console.error("Error fetching leads for tasks:", error);
             // Don't block UI for this, dropdown will just be empty
        });

        // Fetch tasks assigned to the current user
        let tasksQuery;
        if (user.role === 'Admin' || user.role === 'Director') {
            tasksQuery = query(collection(db, 'tasks'));
        } else {
            tasksQuery = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid));
        }

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
    }, [user, isInitialized, toast]);

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

    if (!isInitialized || loading || !user) {
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
                    <Button onClick={handleAddTask}>
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
