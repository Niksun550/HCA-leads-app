
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc, setDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from '@/hooks/use-auth';
import type { AppUser, UserRole, RolePermissions, Branch } from '@/types';
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LoaderCircle, MoreHorizontal, Trash2, Edit, UploadCloud, PlusCircle } from 'lucide-react';
import Image from "next/image";

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
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    
    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);
    const [userPermissions, setUserPermissions] = useState<RolePermissions['navItems']>({});
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    
    const [branches, setBranches] = useState<Branch[]>([]);
    const [newBranchName, setNewBranchName] = useState("");
    const [isAddingBranch, setIsAddingBranch] = useState(false);


    useEffect(() => {
        if (!isAuthLoading) {
            if (!user || user.role !== 'Admin') {
                router.replace('/dashboard');
            } else {
                fetchUsers();
                const { db } = getFirebaseServices();
                if (!db) return;
                const unsubscribeBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
                    const branchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
                    setBranches(branchesData);
                });
                return () => unsubscribeBranches();
            }
        }
    }, [user, isAuthLoading, router]);

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

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleUploadLogo = async () => {
        if (!logoFile) {
            toast({ variant: 'destructive', title: 'No file selected', description: 'Please choose a logo file to upload.' });
            return;
        }

        setIsUploadingLogo(true);
        setUploadProgress(0);
        const { storage, db } = getFirebaseServices();
        if (!storage || !db) return;

        const logoPath = `branding/logo`;
        const fileRef = storageRef(storage, logoPath);
        const uploadTask = uploadBytesResumable(fileRef, logoFile);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed", error);
                toast({ variant: "destructive", title: "Upload Failed", description: error.message });
                setIsUploadingLogo(false);
                setUploadProgress(null);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                try {
                    const settingsRef = doc(db, 'settings', 'branding');
                    await setDoc(settingsRef, { logoUrl: downloadURL }, { merge: true });
                    toast({ title: "Logo updated successfully!", description: "The new logo will be visible to all users on next refresh." });
                } catch (error: any) {
                     toast({ variant: "destructive", title: "Save Failed", description: "Could not save the new logo URL to the database." });
                } finally {
                    setIsUploadingLogo(false);
                    setUploadProgress(null);
                    setLogoFile(null);
                    setLogoPreview(null);
                }
            }
        );
    };

    const handleAddBranch = async () => {
        if (!newBranchName.trim()) {
            toast({ variant: 'destructive', title: 'Branch name cannot be empty.' });
            return;
        }
        setIsAddingBranch(true);
        const { db } = getFirebaseServices();
        if (!db) {
             toast({ variant: 'destructive', title: 'Database not available.' });
             setIsAddingBranch(false);
             return;
        }
        try {
            await addDoc(collection(db, "branches"), { name: newBranchName.trim() });
            toast({ title: 'Branch Added', description: `"${newBranchName.trim()}" has been added.` });
            setNewBranchName("");
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add branch.' });
        } finally {
            setIsAddingBranch(false);
        }
    };
    
    if (isAuthLoading || loading || !user) {
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
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
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
                                    <TableHead className="w-[150px]">Role</TableHead>
                                    <TableHead className="w-[150px] hidden md:table-cell">Branch</TableHead>
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
                                            disabled={user?.uid === u.uid}
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
                                        <TableCell className="hidden md:table-cell">
                                            {u.branchName || <span className="text-muted-foreground">Not Set</span>}
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
                </div>
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Branding</CardTitle>
                            <CardDescription>Customize the look of the application.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="logo-upload">Application Logo</Label>
                                <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml, image/webp" onChange={handleLogoFileChange} />
                                <p className="text-xs text-muted-foreground mt-1">Recommended size: 128x128px</p>
                            </div>

                            {logoPreview && (
                                <div className="p-4 border border-dashed rounded-md flex items-center justify-center">
                                    <Image src={logoPreview} alt="Logo Preview" width={100} height={100} className="object-contain"/>
                                </div>
                            )}

                            {uploadProgress !== null && <Progress value={uploadProgress} />}

                            <Button onClick={handleUploadLogo} disabled={!logoFile || isUploadingLogo}>
                                {isUploadingLogo ? <LoaderCircle className="mr-2 animate-spin" /> : <UploadCloud className="mr-2"/>}
                                Upload Logo
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Branch Management</CardTitle>
                            <CardDescription>Add or remove office branches.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="Enter new branch name..." 
                                    value={newBranchName}
                                    onChange={(e) => setNewBranchName(e.target.value)}
                                />
                                <Button onClick={handleAddBranch} disabled={isAddingBranch || !newBranchName.trim()}>
                                    {isAddingBranch ? <LoaderCircle className="animate-spin" /> : <PlusCircle />}
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {branches.length > 0 ? branches.map(branch => (
                                    <div key={branch.id} className="text-sm p-2 rounded-md bg-muted flex items-center justify-between">
                                        {branch.name}
                                    </div>
                                )) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No branches added yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

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
