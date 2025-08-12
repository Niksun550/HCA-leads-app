
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, updateDoc, onSnapshot, collection } from "firebase/firestore";
import type { Branch } from '@/types';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LoaderCircle, Upload } from 'lucide-react';

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  whatsappNumber: z.string().optional().refine(val => !val || /^\d+$/.test(val), {
    message: "WhatsApp number must contain only digits.",
  }),
  branchId: z.string().optional().nullable(),
});

const ProfileSettings = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            displayName: user?.displayName || "",
            whatsappNumber: user?.whatsappNumber || "",
            branchId: user?.branchId || "",
        },
    });

    useEffect(() => {
        const { db } = getFirebaseServices();
        if(!db) return;
        const unsubscribeBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
            const branchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
            setBranches(branchesData);
        });
        return () => unsubscribeBranches();
    }, []);

    useEffect(() => {
        if (user) {
            form.reset({ 
              displayName: user.displayName || "",
              whatsappNumber: user.whatsappNumber || "",
              branchId: user.branchId || "",
            });
        }
    }, [user, form]);
    
    if (isAuthLoading || !user) {
        return <Skeleton className="h-96 w-full" />
    }

    const handleProfileUpdate = async (values: z.infer<typeof profileFormSchema>) => {
        setIsSubmitting(true);
        const { auth, db } = getFirebaseServices();
        if (!auth.currentUser || !db) return;

        try {
            const selectedBranch = branches.find(b => b.id === values.branchId);

            // Update Auth profile
            await updateProfile(auth.currentUser, { displayName: values.displayName });
            
            // Update Firestore document
            const userDocRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userDocRef, { 
                displayName: values.displayName,
                whatsappNumber: values.whatsappNumber || null,
                branchId: selectedBranch?.id || null,
                branchName: selectedBranch?.name || null,
            });

            toast({ title: "Success", description: "Profile updated successfully." });
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
                         <FormField
                            control={form.control}
                            name="whatsappNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WhatsApp Number</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. 919876543210" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="branchId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Branch</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select your branch" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id}>
                                                {branch.name}
                                                </SelectItem>
                                            ))}
                                            {branches.length === 0 && <SelectItem value="" disabled>No branches available</SelectItem>}
                                        </SelectContent>
                                    </Select>
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application settings.</p>
      </header>

      <ProfileSettings />
    </div>
  );
}
