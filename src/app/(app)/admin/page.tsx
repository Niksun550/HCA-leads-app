
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from '@/hooks/use-auth';
import type { AppUser, UserRole, RolePermissions } from '@/types';
import { userRoles } from '@/types';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LoaderCircle, MoreHorizontal, Trash2, Edit } from 'lucide-react';

const allNavItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'communication', label: 'Communication' },
    { id: 'utility', label: 'Utility (Tasks/Planner)' },
    { id: 'tasks', label: 'Tasks (sub-item)' },
    { id: 'planner', label: 'Planner (sub-item)' },
    { id: 'tools', label: 'Tools' },
    { id: 'board', label: 'Board' },
    { id: 'settings', label: 'Settings' },
    { id: 'admin', label: 'Admin' },
];

const AdminPage = () => {
    const { user, isInitialized } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    
    // State for permissions dialog
    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);
    const [userPermissions, setUserPermissions] = useState<RolePermissions['navItems']>({});
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);


    useEffect(() => {
        if (isInitialized) {
            if (!user || user.role !== 'Admin') {
                router.replace('/dashboard');
            } else {
                fetchUsers();
            }
        }
    }, [user, isInitialized, router]);

    const fetchUsers = async () => {
        setLoading(true);
        const { db } = getFirebaseServices();
        if (!db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured.' });
            setLoading(false);
            return;
        }

        try {
            const usersCollection = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollection);
            const usersData = usersSnapshot.docs.map(doc => doc.data() as AppUser);
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch user data.',
            });
        } finally {
            setLoading(false);
        }
    };
    
    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        const { db } = getFirebaseServices();
        if (!db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured.' });
            return;
        }

        try {
            const userDocRef = doc(db, 'users', uid);
            await updateDoc(userDocRef, { role: newRole });
            setUsers(prevUsers =>
                prevUsers.map(u => (u.uid === uid ? { ...u, role: newRole } : u))
            );
            toast({
                title: 'Success',
                description: 'User role updated successfully.',
            });
        } catch (error) {
            console.error("Error updating role:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not update user role.',
            });
        }
    };
    
    const openDeleteConfirmation = (user: AppUser) => {
      setUserToDelete(user);
      setIsDeleteAlertOpen(true);
    }
    
    const handleDeleteUser = async () => {
      if (!userToDelete || !user) return;

      setIsDeleting(true);
      try {
        const functions = getFunctions();
        const deleteUserFn = httpsCallable(functions, 'deleteUser');
        await deleteUserFn({ uid: userToDelete.uid });
        
        setUsers(prevUsers => prevUsers.filter(u => u.uid !== userToDelete.uid));
        toast({
          title: 'User Deleted',
          description: `${userToDelete.displayName} has been permanently deleted.`,
        });

      } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: error.message || 'An unexpected error occurred.',
        });
      } finally {
        setIsDeleting(false);
        setIsDeleteAlertOpen(false);
        setUserToDelete(null);
      }
    };
    
    const openPermissionDialog = (userToEdit: AppUser) => {
        setEditingUser(userToEdit);
        const defaultPermissions = allNavItems.reduce((acc, item) => ({...acc, [item.id]: true}), {});
        const currentPermissions = userToEdit.permissions?.navItems || defaultPermissions;
        setUserPermissions(currentPermissions);
        setIsPermissionDialogOpen(true);
    };

    const handlePermissionChange = (itemId: string, checked: boolean) => {
        setUserPermissions(prev => ({ ...prev, [itemId]: checked }));
    };

    const handleSavePermissions = async () => {
        if (!editingUser) return;
        
        setIsSavingPermissions(true);
        const { db } = getFirebaseServices();
        if (!db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not configured.' });
            setIsSavingPermissions(false);
            return;
        }

        try {
            const userDocRef = doc(db, 'users', editingUser.uid);
            await updateDoc(userDocRef, {
                permissions: { navItems: userPermissions },
            });
            
            setUsers(prevUsers =>
                prevUsers.map(u => u.uid === editingUser.uid ? { ...u, permissions: { navItems: userPermissions } } : u)
            );
            toast({
                title: 'Permissions Updated',
                description: `Permissions for ${editingUser.displayName} have been saved.`,
            });
            setIsPermissionDialogOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSavingPermissions(false);
        }
    };
    
    if (!isInitialized || loading || !user) {
        return (
            <div className="flex h-[calc(100vh_-_theme(spacing.16))] w-full items-center justify-center bg-background">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="py-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Admin Panel</h1>
                <p className="text-muted-foreground">Manage application settings and users.</p>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage roles and permissions for all users in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border shadow-sm bg-card">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="w-[200px]">Role</TableHead>
                             <TableHead className="text-right w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => (
                            <TableRow key={u.uid}>
                                <TableCell>
                                <div className="font-medium">{u.displayName}</div>
                                <div className="text-sm text-muted-foreground">{u.email}</div>
                                </TableCell>
                                <TableCell>
                                <Select
                                    value={u.role}
                                    onValueChange={(newRole: UserRole) => handleRoleChange(u.uid, newRole)}
                                    disabled={user?.uid === u.uid} // Admin cannot change their own role
                                >
                                    <SelectTrigger>
                                    <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {userRoles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                        {role}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={user?.uid === u.uid}>
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openPermissionDialog(u)} disabled={user?.uid === u.uid}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit Permissions
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                onClick={() => openDeleteConfirmation(u)}
                                                disabled={user?.uid === u.uid}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the user account
                        for <span className="font-semibold">{userToDelete?.displayName}</span> and all associated data.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteUser}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={isDeleting}
                    >
                        {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Delete User
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Permissions for {editingUser?.displayName}</DialogTitle>
                        <DialogDescription>
                            Select the navigation tabs this user should have access to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {allNavItems.map(item => (
                            <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`perm-${item.id}`}
                                    checked={userPermissions[item.id as keyof typeof userPermissions] || false}
                                    onCheckedChange={(checked) => handlePermissionChange(item.id, !!checked)}
                                />
                                <Label htmlFor={`perm-${item.id}`} className="text-sm font-normal">
                                    {item.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPermissionDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePermissions} disabled={isSavingPermissions}>
                           {isSavingPermissions && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                           Save Permissions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AdminPage;
