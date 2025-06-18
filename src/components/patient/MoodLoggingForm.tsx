
"use client";
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EMOTION_HIERARCHY, PREDEFINED_ACTIVITIES, CoreEmotionData } from '@/lib/constants';
import type { Activity } from '@/lib/types';
import { PlusCircle, Send, Trash2, Edit3, X, CheckCircle, Circle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const moodLoggingSchema = z.object({
  selectedCoreEmotion: z.string().optional(), // Name of the core emotion
  selectedPrimaryEmotions: z.array(z.string()),
  selectedSecondaryEmotions: z.array(z.string()),
  activities: z.array(z.object({ id: z.string(), name: z.string() })).min(0, "Select at least one activity if applicable."),
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
});

type MoodLoggingFormData = z.infer<typeof moodLoggingSchema>;

interface MoodLoggingFormProps {
  userId: string;
}

export function MoodLoggingForm({ userId }: MoodLoggingFormProps) {
  const [customActivities, setCustomActivities] = useState<Activity[]>([]);
  const [newActivityName, setNewActivityName] = useState('');
  const { toast } = useToast();

  const form = useForm<MoodLoggingFormData>({
    resolver: zodResolver(moodLoggingSchema),
    defaultValues: {
      selectedCoreEmotion: undefined,
      selectedPrimaryEmotions: [],
      selectedSecondaryEmotions: [],
      activities: [],
      notes: '',
    },
  });

  const selectedCoreEmotionKey = form.watch("selectedCoreEmotion");
  const currentPrimaryEmotions = form.watch("selectedPrimaryEmotions");

  const handleCoreEmotionSelect = (coreKey: string) => {
    if (form.getValues("selectedCoreEmotion") === coreKey) {
      form.setValue("selectedCoreEmotion", undefined); // Deselect if already selected
      form.setValue("selectedPrimaryEmotions", []);
      form.setValue("selectedSecondaryEmotions", []);
    } else {
      form.setValue("selectedCoreEmotion", coreKey);
      form.setValue("selectedPrimaryEmotions", []); // Reset primary/secondary when core changes
      form.setValue("selectedSecondaryEmotions", []);
    }
  };

  const handlePrimaryEmotionToggle = (primaryKey: string) => {
    const currentSelection = form.getValues("selectedPrimaryEmotions");
    const newSelection = currentSelection.includes(primaryKey)
      ? currentSelection.filter(p => p !== primaryKey)
      : [...currentSelection, primaryKey];
    form.setValue("selectedPrimaryEmotions", newSelection);

    // If unselecting a primary, also unselect its secondaries
    if (!newSelection.includes(primaryKey)) {
      const coreData = selectedCoreEmotionKey ? EMOTION_HIERARCHY[selectedCoreEmotionKey] : null;
      if (coreData && coreData.primaryEmotions[primaryKey]?.secondaryEmotions) {
        const secondariesToClear = coreData.primaryEmotions[primaryKey].secondaryEmotions || [];
        form.setValue(
          "selectedSecondaryEmotions",
          form.getValues("selectedSecondaryEmotions").filter(s => !secondariesToClear.includes(s))
        );
      }
    }
  };

  const handleSecondaryEmotionToggle = (secondaryName: string) => {
    const currentSelection = form.getValues("selectedSecondaryEmotions");
    const newSelection = currentSelection.includes(secondaryName)
      ? currentSelection.filter(s => s !== secondaryName)
      : [...currentSelection, secondaryName];
    form.setValue("selectedSecondaryEmotions", newSelection);
  };


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
    const moodWords: string[] = [];
    if (data.selectedCoreEmotion && EMOTION_HIERARCHY[data.selectedCoreEmotion]) {
      moodWords.push(EMOTION_HIERARCHY[data.selectedCoreEmotion].name);
    }
    data.selectedPrimaryEmotions.forEach(pkey => {
      if(data.selectedCoreEmotion && EMOTION_HIERARCHY[data.selectedCoreEmotion]?.primaryEmotions[pkey]) {
        moodWords.push(EMOTION_HIERARCHY[data.selectedCoreEmotion].primaryEmotions[pkey].name);
      }
    });
    moodWords.push(...data.selectedSecondaryEmotions);
    
    if (moodWords.length === 0 && !data.notes && data.activities.length === 0) {
      toast({ variant: "destructive", title: "Empty Log", description: "Please select at least one emotion or add a note/activity." });
      return;
    }

    try {
      await addDoc(collection(db, "users", userId, "moodEntries"), {
        userId,
        moodWords: Array.from(new Set(moodWords)), // Ensure uniqueness
        activities: data.activities.map(a => ({ id: a.id, name: a.name, isCustom: customActivities.some(ca => ca.id === a.id) })),
        notes: data.notes,
        timestamp: serverTimestamp(),
      });
      form.reset({
        selectedCoreEmotion: undefined,
        selectedPrimaryEmotions: [],
        selectedSecondaryEmotions: [],
        activities: [],
        notes: '',
      });
      toast({ title: "Mood Logged!", description: "Your mood entry has been saved." });
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "Logging Failed",
        description: "Could not save your mood entry. Please try again.",
      });
    }
  }

  const coreEmotions = Object.entries(EMOTION_HIERARCHY);

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">How are you feeling?</CardTitle>
        <CardDescription>Select your core emotion, then refine with more specific feelings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Core Emotion Selection */}
            <FormItem>
              <FormLabel className="text-lg font-semibold">Core Emotion</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {coreEmotions.map(([key, { name, colorClass }]) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    className={cn(
                      "justify-start p-4 h-auto text-left transition-all duration-150 ease-in-out",
                      selectedCoreEmotionKey === key ? `${colorClass} ring-2 ring-offset-2 ring-current` : "border-border hover:bg-muted/50",
                      selectedCoreEmotionKey === key ? "shadow-md scale-105" : "hover:shadow-sm"
                    )}
                    onClick={() => handleCoreEmotionSelect(key)}
                  >
                     {selectedCoreEmotionKey === key ? <CheckCircle className="mr-2 h-5 w-5" /> : <Circle className="mr-2 h-5 w-5 text-muted-foreground/50" />}
                    <span className="font-medium">{name}</span>
                  </Button>
                ))}
              </div>
            </FormItem>

            {/* Primary Emotion Selection */}
            {selectedCoreEmotionKey && EMOTION_HIERARCHY[selectedCoreEmotionKey] && (
              <FormField
                control={form.control}
                name="selectedPrimaryEmotions"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">Feeling more specifically...</FormLabel>
                     <ScrollArea className="h-48 rounded-md border p-4">
                      <div className="space-y-2">
                        {Object.entries(EMOTION_HIERARCHY[selectedCoreEmotionKey].primaryEmotions).map(([pkey, pdata]) => (
                           <div key={pkey} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                            <Checkbox
                              id={`primary-${pkey}`}
                              checked={form.getValues("selectedPrimaryEmotions").includes(pkey)}
                              onCheckedChange={() => handlePrimaryEmotionToggle(pkey)}
                            />
                            <label htmlFor={`primary-${pkey}`} className="text-sm font-normal cursor-pointer flex-1">
                              {pdata.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Secondary Emotion Selection */}
            {selectedCoreEmotionKey && currentPrimaryEmotions.length > 0 && (
              <FormField
                control={form.control}
                name="selectedSecondaryEmotions"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">Any of these too?</FormLabel>
                    <ScrollArea className="h-48 rounded-md border p-4">
                      <div className="space-y-2">
                        {currentPrimaryEmotions.map(pkey => {
                          const primaryData = EMOTION_HIERARCHY[selectedCoreEmotionKey]?.primaryEmotions[pkey];
                          if (primaryData && primaryData.secondaryEmotions && primaryData.secondaryEmotions.length > 0) {
                            return (
                              <div key={`secondary-group-${pkey}`} className="pl-4 border-l-2 border-muted ml-2 py-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">{primaryData.name} related:</p>
                                {primaryData.secondaryEmotions.map(sname => (
                                  <div key={sname} className="flex items-center space-x-3 p-1 rounded-md hover:bg-muted/20 transition-colors">
                                    <Checkbox
                                      id={`secondary-${sname.replace(/\s+/g, '-')}`}
                                      checked={form.getValues("selectedSecondaryEmotions").includes(sname)}
                                      onCheckedChange={() => handleSecondaryEmotionToggle(sname)}
                                    />
                                    <label htmlFor={`secondary-${sname.replace(/\s+/g, '-')}`} className="text-sm font-normal cursor-pointer flex-1">
                                      {sname}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


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
