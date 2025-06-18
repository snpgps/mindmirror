
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";


const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.6401 9.20455C17.6401 8.56818 17.5819 7.95455 17.4657 7.36364H9V10.8409H13.8439C13.6366 11.9545 13.0002 12.9091 12.0457 13.5227V15.7045H14.9548C16.6593 14.1136 17.6401 11.8864 17.6401 9.20455Z" fill="#4285F4"/>
    <path d="M9.00001 18C11.4321 18 13.4662 17.1932 14.9546 15.7045L12.0455 13.5227C11.2387 14.0114 10.2273 14.3182 9.00001 14.3182C6.88637 14.3182 5.10228 12.8068 4.45455 10.9545H1.43182V13.1932C2.90909 16.0455 5.68182 18 9.00001 18Z" fill="#34A853"/>
    <path d="M4.45455 10.9545C4.26136 10.4091 4.14773 9.81818 4.14773 9.18182C4.14773 8.54545 4.26136 7.95455 4.45455 7.40909V5.16023H1.43182C0.877273 6.34091 0.534091 7.68182 0.534091 9.18182C0.534091 10.6818 0.877273 12.0227 1.43182 13.1932L4.45455 10.9545Z" fill="#FBBC05"/>
    <path d="M9.00001 3.68182C10.3307 3.68182 11.5091 4.14773 12.4182 4.99545L15.0114 2.4C13.4662 0.909091 11.4321 0 9.00001 0C5.68182 0 2.90909 1.95455 1.43182 4.81818L4.45455 7.05682C5.10228 5.20455 6.88637 3.68182 9.00001 3.68182Z" fill="#EA4335"/>
  </svg>
);

const formSchemaBase = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signupSchema = formSchemaBase.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  role: z.enum(["patient", "doctor"], { required_error: "You must select a role." }),
  doctorCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "doctor") {
    if (!data.doctorCode || data.doctorCode.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Doctor code is required.",
        path: ["doctorCode"],
      });
    } else if (data.doctorCode.trim().length < 6) { // Keep this length or adjust as needed
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Doctor code must be at least 6 characters.",
        path: ["doctorCode"],
      });
    }
  }
});

type AuthFormProps = {
  mode: "login" | "signup";
};

const generateDoctorCode = () => {
  const prefix = "DR";
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 random alphanumeric chars
  return `${prefix}${randomChars}`;
};

export function AuthForm({ mode }: AuthFormProps) {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, isProcessingAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const { toast } = useToast();

  const currentSchema = mode === "signup" ? signupSchema : formSchemaBase;
  type CurrentFormValues = z.infer<typeof currentSchema>;

  const form = useForm<CurrentFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(mode === "signup" && { name: "", role: "patient", doctorCode: "" }),
    },
  });

  const watchedRole = form.watch("role");

  useEffect(() => {
    if (mode === "signup" && watchedRole === "doctor") {
      if (!form.getValues("doctorCode")) { // Only set if not already set (e.g., by user interaction)
        form.setValue("doctorCode" as any, generateDoctorCode());
      }
    } else if (mode === "signup" && watchedRole !== "doctor") {
      form.setValue("doctorCode" as any, ""); // Clear if role is not doctor
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedRole, mode, form.setValue, form.getValues]);

  const handleRegenerateCode = () => {
    if (mode === "signup" && watchedRole === "doctor") {
      form.setValue("doctorCode" as any, generateDoctorCode());
    }
  };

  async function onSubmit(values: CurrentFormValues) {
    setIsSubmittingForm(true);
    try {
      if (mode === "login") {
        await signInWithEmail(values.email, values.password);
      } else if (mode === "signup") {
        const signupValues = values as z.infer<typeof signupSchema>;
        // Ensure doctorCode is explicitly passed, even if optional in base type for Zod
        await signUpWithEmail(signupValues.email, signupValues.password, signupValues.name, signupValues.role, signupValues.doctorCode);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `${mode === "login" ? "Login" : "Sign Up"} Failed`,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmittingForm(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{mode === "login" ? "Welcome Back" : "Create an Account"}</CardTitle>
        <CardDescription>
          {mode === "login" ? "Log in to access your MindMirror dashboard." : "Sign up to start your mental wellness journey."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {mode === "signup" && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === "signup" && (
              <>
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>I am a...</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                          }}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="patient" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Patient (tracking my mood)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="doctor" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Doctor / Healthcare Provider
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedRole === "doctor" && (
                   <FormField
                    control={form.control}
                    name="doctorCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Unique Doctor Code</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input placeholder="e.g., DRJ0DOE7" {...field} />
                          </FormControl>
                          <Button type="button" variant="outline" size="icon" onClick={handleRegenerateCode} aria-label="Regenerate doctor code">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                         <p className="text-xs text-muted-foreground mt-1">This code will be pre-filled. You can edit it or regenerate it.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmittingForm || isProcessingAuth}>
              {isSubmittingForm ? "Processing..." : (mode === "login" ? "Log In" : "Sign Up")}
            </Button>
          </form>
        </Form>
        <div className="my-4 flex items-center">
          <Separator className="flex-1" />
          <span className="px-4 text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isProcessingAuth || isSubmittingForm}>
          <GoogleIcon />
          <span className="ml-2">Sign {mode === "login" ? "in" : "up"} with Google</span>
        </Button>
      </CardContent>
    </Card>
  );
}
