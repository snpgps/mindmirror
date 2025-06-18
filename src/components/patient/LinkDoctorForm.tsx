
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
import { Link2, CheckCircle, AlertTriangle } from 'lucide-react';

const linkDoctorSchema = z.object({
  doctorCode: z.string().min(3, { message: "Doctor code must be at least 3 characters." }),
});

type LinkDoctorFormData = z.infer<typeof linkDoctorSchema>;

interface LinkDoctorFormProps {
  patientId: string;
  currentLink?: string;
}

export function LinkDoctorForm({ patientId, currentLink }: LinkDoctorFormProps) {
  const { toast } = useToast();
  const { user, updateUserInContext } = useAuth(); 
  const [linkedDoctorCode, setLinkedDoctorCode] = useState<string | undefined>(currentLink);

  useEffect(() => {
    // Keep local state in sync if the user prop (and thus currentLink) changes from context
    setLinkedDoctorCode(currentLink);
  }, [currentLink]);


  const form = useForm<LinkDoctorFormData>({
    resolver: zodResolver(linkDoctorSchema),
    defaultValues: {
      doctorCode: '',
    },
  });

  function onSubmit(data: LinkDoctorFormData) {
    console.log(`Patient ${patientId} attempting to link with doctor code: ${data.doctorCode}`);
    
    setTimeout(() => {
      // Mock: Assume doctor code "DRTEST123" or any starting with "DR" is valid
      if (data.doctorCode === "DRTEST123" || data.doctorCode.toUpperCase().startsWith("DR")) {
        if (user && user.role === 'patient') {
          const updatedPatientProfile = { ...user, linkedDoctorCode: data.doctorCode } as Patient;
          updateUserInContext(updatedPatientProfile); // Update context and localStorage via hook
          setLinkedDoctorCode(data.doctorCode); // Update local state for UI
        }
        toast({
          title: "Successfully Linked!",
          description: `You are now linked with doctor code: ${data.doctorCode}.`,
        });
        form.reset();
      } else {
        toast({
          variant: "destructive",
          title: "Linking Failed",
          description: "The doctor code entered is invalid. Please check and try again.",
        });
      }
    }, 1000);
  }

  const handleUnlink = () => {
     if (user && user.role === 'patient') {
        const updatedPatientProfile = { ...user, linkedDoctorCode: undefined } as Patient;
        updateUserInContext(updatedPatientProfile);
        setLinkedDoctorCode(undefined);
      }
    toast({
      title: "Unlinked Successfully",
      description: "You have unlinked from your doctor.",
    });
  }

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
            <div className="flex items-center p-4 rounded-md bg-green-50 border border-green-200 text-green-700">
              <CheckCircle className="h-5 w-5 mr-3 shrink-0" />
              <p>Successfully linked with code: <span className="font-semibold">{linkedDoctorCode}</span></p>
            </div>
            <Button onClick={handleUnlink} variant="destructive" className="w-full">
              Unlink from Doctor
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
                      <Input placeholder="Enter code (e.g., DRTEST123)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
                <Link2 className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Linking..." : "Link Account"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex items-start p-3 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-xs">
            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
            <p>Sharing your logs helps your doctor provide better care. You can unlink at any time.</p>
        </div>
      </CardFooter>
    </Card>
  );
}
