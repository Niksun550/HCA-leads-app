
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";
import { UserRole, userRoles } from "@/types";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

interface AddUserFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onUserAdded: () => void;
}

const formSchema = z.object({
  displayName: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(userRoles),
});

// We need to create a cloud function to create users.
// This is because client-side SDKs cannot create users with a specific UID or role.
// We'll stub this out for now and assume it exists.
// In a real project, you would deploy this function to Firebase.
const createUser = httpsCallable(functions, 'createUser');


export default function AddUserForm({ isOpen, setIsOpen, onUserAdded }: AddUserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      role: "Sales Rep",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // In a real application, you would need a Cloud Function to create a user
      // from the admin SDK, as the client SDK doesn't allow role assignment on creation.
      // For this prototype, we'll simulate this action.
      console.log("Simulating user creation with:", values);
      
      // This is a placeholder. In a real app, you'd use a Cloud Function.
      // For now, we will log to console and show a success message.
      // The user won't actually be created in Firebase Auth.
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      toast({
        title: "User Added (Simulated)",
        description: `User ${values.displayName} has been added with the role ${values.role}.`,
      });
      
      form.reset();
      onUserAdded();
      setIsOpen(false);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Add User",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign them a role. They will receive an email to set up their account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Add User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
