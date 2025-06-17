"use client";
import React, { useState } from 'react';
import type { MoodEntry, Activity } from '@/lib/types';
import { EMOJI_DETAILS, MOOD_WORDS, PREDEFINED_ACTIVITIES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Tag, ListChecks, Filter, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface MoodTimelineProps {
  entries: MoodEntry[];
}

export function MoodTimeline({ entries }: MoodTimelineProps) {
  const [selectedMoodWords, setSelectedMoodWords] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const handleMoodWordFilterChange = (word: string, checked: boolean) => {
    setSelectedMoodWords(prev => checked ? [...prev, word] : prev.filter(w => w !== word));
  };

  const handleActivityFilterChange = (activityName: string, checked: boolean) => {
    setSelectedActivities(prev => checked ? [...prev, activityName] : prev.filter(a => a !== activityName));
  };
  
  const allActivitiesNames = PREDEFINED_ACTIVITIES.map(a => a.name); // Assuming custom activities are not filterable yet or need to be aggregated

  const filteredEntries = entries.filter(entry => {
    const moodWordMatch = selectedMoodWords.length === 0 || entry.moodWords.some(word => selectedMoodWords.includes(word));
    const activityMatch = selectedActivities.length === 0 || entry.activities.some(activity => selectedActivities.includes(activity.name));
    return moodWordMatch && activityMatch;
  }).sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  const clearFilters = () => {
    setSelectedMoodWords([]);
    setSelectedActivities([]);
  };

  if (entries.length === 0) {
    return (
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Your Mood Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You haven&apos;t logged any moods yet. Start logging to see your timeline!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="font-headline text-2xl">Your Mood Timeline</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter by Mood Words</h4>
                    <ScrollArea className="h-32">
                    {MOOD_WORDS.map(word => (
                      <div key={word} className="flex items-center space-x-2 py-1">
                        <Checkbox 
                          id={`filter-mood-${word}`} 
                          checked={selectedMoodWords.includes(word)}
                          onCheckedChange={(checked) => handleMoodWordFilterChange(word, !!checked)}
                        />
                        <Label htmlFor={`filter-mood-${word}`} className="text-sm font-normal">{word}</Label>
                      </div>
                    ))}
                    </ScrollArea>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter by Activities</h4>
                     <ScrollArea className="h-32">
                    {allActivitiesNames.map(activityName => (
                      <div key={activityName} className="flex items-center space-x-2 py-1">
                        <Checkbox 
                          id={`filter-activity-${activityName}`} 
                          checked={selectedActivities.includes(activityName)}
                          onCheckedChange={(checked) => handleActivityFilterChange(activityName, !!checked)}
                        />
                        <Label htmlFor={`filter-activity-${activityName}`} className="text-sm font-normal">{activityName}</Label>
                      </div>
                    ))}
                     </ScrollArea>
                  </div>
                  {(selectedMoodWords.length > 0 || selectedActivities.length > 0) && (
                     <Button variant="ghost" size="sm" onClick={clearFilters} className="text-accent hover:text-accent/80">
                        <X className="mr-2 h-4 w-4" /> Clear All Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEntries.length > 0 ? (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {filteredEntries.map(entry => (
                <Card key={entry.id} className="bg-background/50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-4xl ${EMOJI_DETAILS[entry.moodLevel]?.colorClass || ''}`}>
                          {EMOJI_DETAILS[entry.moodLevel]?.emoji || '😐'}
                        </span>
                        <div>
                          <CardTitle className="text-xl font-semibold">{EMOJI_DETAILS[entry.moodLevel]?.label || 'Mood'}
                          </CardTitle>
                           <p className="text-xs text-muted-foreground flex items-center">
                            <CalendarDays className="mr-1.5 h-3 w-3" />
                            {format(parseISO(entry.timestamp), "PPpp")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {entry.moodWords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground self-center" />
                        {entry.moodWords.map(word => (
                          <Badge key={word} variant="secondary">{word}</Badge>
                        ))}
                      </div>
                    )}
                    {entry.activities.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <ListChecks className="h-4 w-4 text-muted-foreground self-center" />
                        {entry.activities.map(activity => (
                          <Badge key={activity.id} variant="outline">
                            {PREDEFINED_ACTIVITIES.find(pa => pa.id === activity.id)?.icon && 
                             React.createElement(PREDEFINED_ACTIVITIES.find(pa => pa.id === activity.id)!.icon!, {className: "mr-1 h-3 w-3 inline"})}
                            {activity.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-foreground/80 bg-muted/30 p-3 rounded-md border border-border/50 whitespace-pre-wrap">{entry.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-8">No entries match your current filters. Try adjusting them!</p>
        )}
      </CardContent>
    </Card>
  );
}
