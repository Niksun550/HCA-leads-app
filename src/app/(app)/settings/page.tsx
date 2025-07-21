
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AppUser, UserRole } from '@/types';
import { userRoles } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LoaderCircle, Upload } from 'lucide-react';

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
});

const AdminSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

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
        if (user?.role === 'Admin') {
            fetchUsers();
        }
    }, [user]);

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
    
    if (loading) {
        return (
            <div className="rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
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
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage roles for all users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    )
}

const ProfileSettings = () => {
    const { user, isInitialized } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            displayName: user?.displayName || "",
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({ displayName: user.displayName || "" });
        }
    }, [user, form]);
    
    if (!isInitialized || !user) {
        return <Skeleton className="h-96 w-full" />
    }

    const handleProfileUpdate = async (values: z.infer<typeof profileFormSchema>) => {
        setIsSubmitting(true);
        const { auth, db } = getFirebaseServices();
        if (!auth.currentUser || !db) return;

        try {
            await updateProfile(auth.currentUser, { displayName: values.displayName });
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userDocRef, { displayName: values.displayName });
            toast({ title: "Success", description: "Profile updated successfully." });
            // This is a workaround to force re-fetch of user data in useAuth
            router.refresh(); 
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePasswordReset = async () => {
        setIsSendingEmail(true);
        const { auth } = getFirebaseServices();
        if (!user?.email) {
            toast({ variant: "destructive", title: "Error", description: "No email address found for this account." });
            setIsSendingEmail(false);
            return;
        }

        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions to reset your password." });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSendingEmail(false);
        }
    };
    
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        
        const { storage, auth, db } = getFirebaseServices();
        if (!storage || !auth.currentUser || !db) return;

        setIsUploading(true);
        try {
            const filePath = `avatars/${user.uid}/${file.name}`;
            const fileRef = storageRef(storage, filePath);
            await uploadBytes(fileRef, file);
            const photoURL = await getDownloadURL(fileRef);

            await updateProfile(auth.currentUser, { photoURL });
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL });

            toast({ title: "Success", description: "Profile picture updated."});
            router.refresh();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };
    
    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).join('');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your personal account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <div className="flex items-center gap-4">
                     <div className="relative">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <Button
                            size="icon"
                            variant="outline"
                            className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                            onClick={handleAvatarClick}
                            disabled={isUploading}
                        >
                            {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span className="sr-only">Upload picture</span>
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold">{user.displayName}</h2>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                     </div>
                 </div>

                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                 </Form>

                 <div>
                    <h3 className="text-lg font-medium">Security</h3>
                    <div className="mt-4 rounded-md border p-4 flex items-center justify-between">
                         <div>
                            <p className="font-medium">Password</p>
                            <p className="text-sm text-muted-foreground">Reset your password via email.</p>
                         </div>
                         <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingEmail}>
                             {isSendingEmail && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                             Send Reset Email
                         </Button>
                    </div>
                 </div>
            </CardContent>
        </Card>
    )
}

export default function SettingsPage() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/dashboard');
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application settings.</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {user.role === 'Admin' && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile" className="pt-6">
            <ProfileSettings />
        </TabsContent>
        {user.role === 'Admin' && (
            <TabsContent value="admin" className="pt-6">
                <AdminSettings />
            </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
