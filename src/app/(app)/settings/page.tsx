
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
import { doc, updateDoc } from "firebase/firestore";

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
    <div className="py-4 space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application settings.</p>
      </header>

      <ProfileSettings />
    </div>
  );
}
