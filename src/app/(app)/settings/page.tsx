
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AppUser, UserRole } from '@/types';
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
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LoaderCircle } from 'lucide-react';
import AddUserForm from '@/components/settings/add-user-form';

export default function SettingsPage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserFormOpen, setIsAddUserFormOpen] = useState(false);

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

  useEffect(() => {
    if (!isInitialized) return;
    
    if (!user || user.role !== 'Admin') {
      router.replace('/dashboard');
      return;
    }
    
    fetchUsers();
  }, [isInitialized, user, router]);

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
  
  const onUserAdded = () => {
    fetchUsers();
  };


  if (loading || !isInitialized) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
        </div>
         <div className="rounded-lg border shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48 mt-1" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-10 w-32" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'Admin') {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <>
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground">Manage user roles.</p>
        </div>
        <Button onClick={() => setIsAddUserFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
        </Button>
      </header>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="w-[200px]">Role</TableHead>
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
                    disabled={user.uid === u.uid} // Admin cannot change their own role
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    <AddUserForm 
        isOpen={isAddUserFormOpen}
        setIsOpen={setIsAddUserFormOpen}
        onUserAdded={onUserAdded}
    />
    </>
  );
}
