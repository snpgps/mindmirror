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
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const formSchemaBase = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signupSchema = formSchemaBase.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  role: z.enum(["patient", "doctor"], { required_error: "You must select a role." }),
  doctorCode: z.string().optional(), // For doctors to set their code during signup
});

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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

  function onSubmit(values: CurrentFormValues) {
    // Mock login/signup
    if (mode === "login") {
      // In a real app, you'd verify credentials and role.
      // For mock, we'll assume a role based on a stored value or default to patient.
      // This mock login needs a role to redirect correctly.
      // Simple hack: if email contains 'doctor', assign doctor role.
      const inferredRole: UserRole = values.email.toLowerCase().includes("doctor") ? "doctor" : "patient";
      login(values.email, values.email.split('@')[0], inferredRole);
    } else if (mode === "signup") {
      const signupValues = values as z.infer<typeof signupSchema>;
      login(signupValues.email, signupValues.name, signupValues.role, signupValues.doctorCode);
    }
  }

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
                          onValueChange={field.onChange}
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
                {form.watch("role") === "doctor" && (
                   <FormField
                    control={form.control}
                    name="doctorCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Unique Doctor Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Create a shareable code (e.g., DRSMITH123)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Processing..." : (mode === "login" ? "Log In" : "Sign Up")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
