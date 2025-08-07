
"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Task, TaskStatus, TaskPriority, TaskCategory } from "@/types";
import { taskStatuses } from "@/types";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { LoaderCircle, Briefcase, DollarSign, FileText, Phone, Clock, ChevronUp, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStrictDroppable } from "@/hooks/use-strict-droppable";

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
    High: <ChevronUp className="h-4 w-4 text-red-500" />,
    Medium: <div className="h-0.5 w-3 bg-yellow-500 rounded-full" />,
    Low: <div className="h-0.5 w-3 bg-green-500 rounded-full" />,
};

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
    'Visit': <Briefcase className="h-4 w-4" />,
    'Payment Collection': <DollarSign className="h-4 w-4" />,
    'Quotation': <FileText className="h-4 w-4" />,
    'Follow-up': <Phone className="h-4 w-4" />,
    'Other': <Clock className="h-4 w-4" />,
};

type BoardData = {
    [key in TaskStatus]: {
        name: TaskStatus;
        items: Task[];
    };
};

const Column = ({ column, columnId }: { column: { name: TaskStatus; items: Task[] }, columnId: string }) => {
    const [isDroppable] = useStrictDroppable(true);

    return (
        <div className="rounded-lg p-3 bg-muted/60 min-w-[300px] w-[300px] flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">{column.name}</h3>
                <Badge variant="secondary">{column.items.length}</Badge>
            </div>
            {isDroppable && (
                <Droppable key={columnId} droppableId={columnId}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`transition-colors min-h-[400px] space-y-3 rounded-md ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
                        >
                            {column.items.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{ ...provided.draggableProps.style }}
                                            className={`bg-card p-4 rounded-lg shadow-sm border ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <p className="font-medium break-words pr-2">{item.title}</p>
                                                <span title={item.priority + " priority"}>{priorityIcons[item.priority]}</span>
                                            </div>
                                            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                                            <div className="flex items-center justify-between mt-3">
                                                <Badge variant="secondary" className="gap-1.5 pl-1.5 text-xs">
                                                    <span title={item.category}>{categoryIcons[item.category]}</span>
                                                    {item.category}
                                                </Badge>
                                                <div title={`Assigned to ${item.assigneeName}`}>
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-xs">{item.assigneeName.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            {column.items.length === 0 && <div className="text-center text-sm text-muted-foreground pt-16">No tasks here</div>}
                        </div>
                    )}
                </Droppable>
            )}
        </div>
    );
};


export default function BoardPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState<BoardData | null>(null);

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

        const tasksQuery = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid));
        
        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            const newColumns: BoardData = taskStatuses.reduce((acc, status) => {
                acc[status] = { name: status, items: [] };
                return acc;
            }, {} as BoardData);

            tasksData.forEach(task => {
                if (newColumns[task.status]) {
                    newColumns[task.status].items.push(task);
                }
            });
            
            // Sort tasks within each column by priority (High > Medium > Low)
            Object.values(newColumns).forEach(column => {
                column.items.sort((a, b) => {
                    const priorityOrder: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });
            });

            setColumns(newColumns);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            toast({ variant: 'destructive', title: "Error fetching tasks", description: error.message });
            setLoading(false);
        });

        return () => unsubscribeTasks();
    }, [user, isAuthLoading, toast]);

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination || !columns) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const startColumn = columns[source.droppableId as TaskStatus];
        const endColumn = columns[destination.droppableId as TaskStatus];
        
        const startItems = Array.from(startColumn.items);
        const [movedItem] = startItems.splice(source.index, 1);
        
        const newColumns = { ...columns };

        if (startColumn.name === endColumn.name) {
             const newItems = startItems;
             newItems.splice(destination.index, 0, movedItem);
             newColumns[startColumn.name] = {
                ...startColumn,
                items: newItems,
             };
        } else {
            const endItems = Array.from(endColumn.items);
            endItems.splice(destination.index, 0, movedItem);
            newColumns[startColumn.name] = {
                ...startColumn,
                items: startItems,
            };
            newColumns[endColumn.name] = {
                ...endColumn,
                items: endItems,
            };
        }
        
        setColumns(newColumns);

        // Update Firestore
        const { db } = getFirebaseServices();
        if (!db) return;
        const taskRef = doc(db, "tasks", draggableId);
        try {
            await updateDoc(taskRef, {
                status: destination.droppableId as TaskStatus
            });
            toast({ title: "Task Updated", description: `Task moved to "${destination.droppableId}".` });
        } catch (error) {
            console.error("Error updating task status:", error);
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update task status." });
            // Revert state if Firestore update fails
            setColumns(columns);
        }
    };
    
    if (loading || isAuthLoading || !user) {
        return (
             <div className="flex h-[calc(100vh-theme(spacing.16))] w-full items-center justify-center bg-background">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="py-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Task Board</h1>
                <p className="text-muted-foreground">Manage your workflow with a drag-and-drop board.</p>
            </header>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-5 pb-4 overflow-x-auto">
                    {taskStatuses.map((status) => {
                        const column = columns?.[status];
                        if (!column) return null;
                        return <Column key={status} column={column} columnId={status} />;
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
