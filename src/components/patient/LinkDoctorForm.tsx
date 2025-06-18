
"use client";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; 
import type { Patient } from '@/lib/types';
import { Link2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDocs, collection, query, where, serverTimestamp, deleteField, FieldValue } from 'firebase/firestore';


const linkDoctorSchema = z.object({
  doctorCode: z.string().min(3, { message: "Doctor code must be at least 3 characters." }),
});

type LinkDoctorFormData = z.infer<typeof linkDoctorSchema>;

interface LinkDoctorFormProps {
  patientId: string;
  currentLink?: string; // This is the currentLink from the auth context
}

export function LinkDoctorForm({ patientId, currentLink }: LinkDoctorFormProps) {
  const { toast } = useToast();
  const { user, updateUserInContext } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // The linkedDoctorCode for the UI should directly come from the user object in the auth context.
  const linkedDoctorCode = user && user.role === 'patient' ? (user as Patient).linkedDoctorCode : undefined;

  const form = useForm<LinkDoctorFormData>({
    resolver: zodResolver(linkDoctorSchema),
    defaultValues: {
      doctorCode: '',
    },
  });

  // Function to verify if a doctor with the given code exists
  async function verifyDoctorCode(doctorCode: string): Promise<boolean> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "doctor"), where("doctorCode", "==", doctorCode));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Returns true if a doctor with that code exists
  }


  async function onSubmit(data: LinkDoctorFormData) {
    setIsSubmitting(true);
    if (!user || user.role !== 'patient') {
      toast({ variant: "destructive", title: "Error", description: "Invalid user session." });
      setIsSubmitting(false);
      return;
    }

    try {
      const doctorExists = await verifyDoctorCode(data.doctorCode);
      if (!doctorExists) {
        toast({
          variant: "destructive",
          title: "Linking Failed",
          description: "The doctor code entered is invalid or does not exist. Please check and try again.",
        });
        setIsSubmitting(false);
        return;
      }

      const patientDocRef = doc(db, "users", patientId);
      await updateDoc(patientDocRef, {
        linkedDoctorCode: data.doctorCode
      });

      // Update user in context to reflect the change immediately
      await updateUserInContext({ linkedDoctorCode: data.doctorCode });
      
      toast({
        title: "Successfully Linked!",
        description: `You are now linked with doctor code: ${data.doctorCode}.`,
      });
      form.reset();

    } catch (error) {
      console.error("Error linking doctor:", error);
      toast({
        variant: "destructive",
        title: "Linking Error",
        description: "Could not link with the doctor. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleUnlink = async () => {
    setIsSubmitting(true);
    if (!user || user.role !== 'patient') {
      toast({ variant: "destructive", title: "Error", description: "Invalid user session." });
      setIsSubmitting(false);
      return;
    }

    try {
      const patientDocRef = doc(db, "users", patientId);
      await updateDoc(patientDocRef, {
        linkedDoctorCode: deleteField() // Removes the field from Firestore
      });

      // Update user in context
      await updateUserInContext({ linkedDoctorCode: undefined });

      toast({
        title: "Unlinked Successfully",
        description: "You have unlinked from your doctor.",
      });
    } catch (error) {
      console.error("Error unlinking doctor:", error);
      toast({
        variant: "destructive",
        title: "Unlinking Error",
        description: "Could not unlink from the doctor. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    // Reset form if linkedDoctorCode changes (e.g. after linking/unlinking)
    // This ensures the input field is cleared after successful linking
    if(linkedDoctorCode && form.getValues("doctorCode")){
        form.reset({ doctorCode: '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedDoctorCode]);


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Connect with Your Doctor</CardTitle>
        <CardDescription>
          {linkedDoctorCode 
            ? "You are currently linked with your doctor."
            : "Enter your doctor's unique code to share your mood logs."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkedDoctorCode ? (
          <div className="space-y-4">
            <div className="flex items-center p-4 rounded-md bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5 mr-3 shrink-0" />
              <p>Successfully linked with code: <span className="font-semibold">{linkedDoctorCode}</span></p>
            </div>
            <Button onClick={handleUnlink} variant="destructive" className="w-full" disabled={isSubmitting}>
              <XCircle className="mr-2 h-4 w-4" />
              {isSubmitting ? "Processing..." : "Unlink from Doctor"}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="doctorCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor&apos;s Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter doctor's code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                <Link2 className="mr-2 h-4 w-4" />
                {isSubmitting ? "Linking..." : "Link Account"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex items-start p-3 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-xs dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-300">
            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
            <p>Sharing your logs helps your doctor provide better care. You can unlink at any time. Ensure you have the correct code from your provider.</p>
        </div>
      </CardFooter>
    </Card>
  );
}

