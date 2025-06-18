
"use client";
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EMOJI_DETAILS, MOOD_WORDS, PREDEFINED_ACTIVITIES } from '@/lib/constants';
import type { MoodLevel, Activity, MoodEntry } from '@/lib/types';
import { PlusCircle, Send, Trash2, Edit3, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


const moodLoggingSchema = z.object({
  moodLevel: z.custom<MoodLevel>((val) => typeof val === 'number' && val >= 1 && val <= 5, {
    message: "Please select your mood.",
  }),
  moodWords: z.array(z.string()).min(0, "Select at least one mood word if applicable."),
  activities: z.array(z.object({ id: z.string(), name: z.string() })).min(0, "Select at least one activity if applicable."),
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
});

type MoodLoggingFormData = z.infer<typeof moodLoggingSchema>;

interface MoodLoggingFormProps {
  // onLogMood is removed as data will be written directly to Firestore and PatientDashboardPage will listen for updates.
  userId: string;
}

export function MoodLoggingForm({ userId }: MoodLoggingFormProps) {
  const [customActivities, setCustomActivities] = useState<Activity[]>([]);
  const [newActivityName, setNewActivityName] = useState('');
  const { toast } = useToast();

  const form = useForm<MoodLoggingFormData>({
    resolver: zodResolver(moodLoggingSchema),
    defaultValues: {
      moodLevel: 3 as MoodLevel,
      moodWords: [],
      activities: [],
      notes: '',
    },
  });

  const handleAddCustomActivity = () => {
    if (newActivityName.trim() && !customActivities.find(act => act.name === newActivityName.trim()) && !PREDEFINED_ACTIVITIES.find(act => act.name === newActivityName.trim())) {
      const newActivity: Activity = {
        id: `custom-${Date.now()}`,
        name: newActivityName.trim(),
        isCustom: true,
      };
      setCustomActivities(prev => [...prev, newActivity]);
      const currentActivities = form.getValues("activities");
      form.setValue("activities", [...currentActivities, {id: newActivity.id, name: newActivity.name}]);
      setNewActivityName('');
      toast({ title: "Activity Added", description: `${newActivity.name} has been added to your list and selected.` });
      document.getElementById('dialog-close-button')?.click(); 
    } else {
      toast({ variant: "destructive", title: "Error", description: "Activity name is empty or already exists." });
    }
  };
  
  const allActivities = [...PREDEFINED_ACTIVITIES, ...customActivities];

  async function onSubmit(data: MoodLoggingFormData) {
    try {
      await addDoc(collection(db, "users", userId, "moodEntries"), {
        userId,
        moodLevel: data.moodLevel,
        moodWords: data.moodWords,
        activities: data.activities.map(a => ({ id: a.id, name: a.name, isCustom: customActivities.some(ca => ca.id === a.id) })),
        notes: data.notes,
        timestamp: serverTimestamp(), // Firestore server timestamp
      });
      form.reset({ 
        moodLevel: 3 as MoodLevel, // Reset to default values
        moodWords: [],
        activities: [],
        notes: '',
      });
      toast({ title: "Mood Logged!", description: "Your mood entry has been saved to the cloud." });
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "Logging Failed",
        description: "Could not save your mood entry. Please try again.",
      });
    }
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">How are you feeling?</CardTitle>
        <CardDescription>Log your current mood, associated feelings, and activities.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="moodLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Your Mood</FormLabel>
                  <FormControl>
                    <div className="flex justify-around items-center p-4 bg-muted/50 rounded-lg">
                      {Object.entries(EMOJI_DETAILS).map(([level, { emoji, label, colorClass }]) => (
                        <button
                          type="button"
                          key={level}
                          onClick={() => field.onChange(parseInt(level) as MoodLevel)}
                          className={`p-2 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                            field.value === parseInt(level) ? 'transform scale-125 ring-2 ring-primary bg-primary/20' : 'hover:scale-110'
                          }`}
                          aria-label={`${label} mood`}
                        >
                          <span className={`text-4xl md:text-5xl ${colorClass}`}>{emoji}</span>
                          <span className={`block text-xs mt-1 font-medium ${field.value === parseInt(level) ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moodWords"
              render={() => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">I&apos;m Feeling...</FormLabel>
                  <ScrollArea className="h-40 rounded-md border p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {MOOD_WORDS.map((word) => (
                      <FormField
                        key={word}
                        control={form.control}
                        name="moodWords"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={word}
                              className="flex flex-row items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(word)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), word])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== word
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {word}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="activities"
              render={() => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-lg font-semibold">Activities Today</FormLabel>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Custom
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Activity</DialogTitle>
                        </DialogHeader>
                        <Input 
                          placeholder="E.g., Morning Walk" 
                          value={newActivityName} 
                          onChange={(e) => setNewActivityName(e.target.value)} 
                        />
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="ghost" id="dialog-close-button">Cancel</Button>
                          </DialogClose>
                          <Button type="button" onClick={handleAddCustomActivity}>Add Activity</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <ScrollArea className="h-40 rounded-md border p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {allActivities.map((activity) => (
                      <FormField
                        key={activity.id}
                        control={form.control}
                        name="activities"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={activity.id}
                              className="flex flex-row items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.some(a => a.id === activity.id)}
                                  onCheckedChange={(checked) => {
                                    const activityObj = {id: activity.id, name: activity.name};
                                    return checked
                                      ? field.onChange([...(field.value || []), activityObj])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value.id !== activity.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal flex items-center">
                                {activity.icon && React.createElement(activity.icon, {className: "mr-1.5 h-4 w-4 text-muted-foreground"})}
                                {activity.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any thoughts or details about your mood..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
               {form.formState.isSubmitting ? "Saving..." : <> <Send className="mr-2 h-5 w-5" /> Log My Mood </>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

