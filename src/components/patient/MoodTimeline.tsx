
"use client";
import React, { useState } from 'react';
import type { MoodEntry, Activity } from '@/lib/types';
import { EMOTION_HIERARCHY, PREDEFINED_ACTIVITIES, ALL_EMOTION_WORDS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Tag, ListChecks, Filter, X, Palette, CircleDot } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

interface MoodTimelineProps {
  entries: MoodEntry[];
}

export function MoodTimeline({ entries }: MoodTimelineProps) {
  const [selectedMoodWordsFilter, setSelectedMoodWordsFilter] = useState<string[]>([]);
  const [selectedActivitiesFilter, setSelectedActivitiesFilter] = useState<string[]>([]);

  const handleMoodWordFilterChange = (word: string, checked: boolean) => {
    setSelectedMoodWordsFilter(prev => checked ? [...prev, word] : prev.filter(w => w !== word));
  };

  const handleActivityFilterChange = (activityName: string, checked: boolean) => {
    setSelectedActivitiesFilter(prev => checked ? [...prev, activityName] : prev.filter(a => a !== activityName));
  };

  const allActivityNamesForFilter = PREDEFINED_ACTIVITIES.map(a => a.name);

  const filteredEntries = entries.filter(entry => {
    const moodWordMatch = selectedMoodWordsFilter.length === 0 || (entry.moodWords && entry.moodWords.some(word => selectedMoodWordsFilter.includes(word)));
    const activityMatch = selectedActivitiesFilter.length === 0 || (entry.activities && entry.activities.some(activity => selectedActivitiesFilter.includes(activity.name)));
    return moodWordMatch && activityMatch;
  }).sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  const clearFilters = () => {
    setSelectedMoodWordsFilter([]);
    setSelectedActivitiesFilter([]);
  };

  const getCoreEmotionStyle = (moodWords: string[]): { name: string, badgeClassName: string, dotClassName: string } => {
    if (!moodWords || moodWords.length === 0) return { name: "Mood", badgeClassName: "bg-muted text-muted-foreground border-border", dotClassName: "bg-muted-foreground" };
    const firstWord = moodWords[0];
    for (const coreKey in EMOTION_HIERARCHY) {
      if (EMOTION_HIERARCHY[coreKey].name === firstWord) {
        const baseColorClass = EMOTION_HIERARCHY[coreKey].colorClass.split(' ')[0]; // e.g., bg-green-500
        const textColorClass = EMOTION_HIERARCHY[coreKey].colorClass.includes('text-white') ? 'text-white' : `text-${baseColorClass.split('-')[1]}-700`;
        const borderColorClass = `border-${baseColorClass.split('-')[1]}-300`;
        
        return {
          name: EMOTION_HIERARCHY[coreKey].name,
          badgeClassName: `${baseColorClass.replace('-500', '-100')} ${textColorClass.replace('-700', '-800')} ${borderColorClass.replace('-300','-200')} dark:${baseColorClass.replace('-500', '-800/70')} dark:${textColorClass.replace('-700', '-200')} dark:${borderColorClass.replace('-300','-700')}`,
          dotClassName: `${baseColorClass}` // The solid color for the dot
        };
      }
    }
    return { name: firstWord, badgeClassName: "bg-muted text-muted-foreground border-border", dotClassName: "bg-muted-foreground" };
  };


  if (entries.length === 0) {
    return (
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Mood Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No moods logged yet. Start logging to see the timeline!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="font-headline text-2xl">Mood Timeline</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter ({filteredEntries.length} / {entries.length})</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter by Emotions</h4>
                    <ScrollArea className="h-32 border rounded-md p-2">
                    {ALL_EMOTION_WORDS.sort().map(word => (
                      <div key={word} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`filter-mood-${word.replace(/\s+/g, '-')}`}
                          checked={selectedMoodWordsFilter.includes(word)}
                          onCheckedChange={(checked) => handleMoodWordFilterChange(word, !!checked)}
                        />
                        <Label htmlFor={`filter-mood-${word.replace(/\s+/g, '-')}`} className="text-sm font-normal">{word}</Label>
                      </div>
                    ))}
                    </ScrollArea>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter by Activities</h4>
                     <ScrollArea className="h-32 border rounded-md p-2">
                    {allActivityNamesForFilter.map(activityName => (
                      <div key={activityName} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`filter-activity-${activityName.replace(/\s+/g, '-')}`}
                          checked={selectedActivitiesFilter.includes(activityName)}
                          onCheckedChange={(checked) => handleActivityFilterChange(activityName, !!checked)}
                        />
                        <Label htmlFor={`filter-activity-${activityName.replace(/\s+/g, '-')}`} className="text-sm font-normal">{activityName}</Label>
                      </div>
                    ))}
                     </ScrollArea>
                  </div>
                  {(selectedMoodWordsFilter.length > 0 || selectedActivitiesFilter.length > 0) && (
                     <Button variant="ghost" size="sm" onClick={clearFilters} className="text-accent hover:text-accent/80 justify-start p-1">
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
          <ScrollArea className="h-[500px] pr-3">
            <div className="relative pl-4">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border -z-10"></div>
              
              {filteredEntries.map((entry, index) => {
                const coreEmotionStyle = getCoreEmotionStyle(entry.moodWords);
                return (
                  <div key={entry.id} className="relative pl-10 pb-8 last:pb-0">
                    {/* Dot on the timeline */}
                    <div className={cn(
                      "absolute left-[18px] top-[5px] h-5 w-5 rounded-full border-4 border-background",
                      coreEmotionStyle.dotClassName
                    )}></div>

                    {/* Connector line for all but the last item */}
                    {index < filteredEntries.length -1 && (
                       <div className="absolute left-6 top-[25px] bottom-0 w-0.5 bg-border"></div>
                    )}
                    
                    <div className="pt-0.5"> {/* Align content with the dot */}
                       <p className="text-xs text-muted-foreground flex items-center mb-2">
                          <CalendarDays className="mr-1.5 h-3 w-3" />
                          {format(parseISO(entry.timestamp), "PPpp")}
                        </p>
                      <Card className="bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3 pt-4 px-4">
                           <Badge className={cn("text-md px-3 py-1 self-start", coreEmotionStyle.badgeClassName)}>
                              {coreEmotionStyle.name}
                           </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 pb-4">
                          {entry.moodWords && entry.moodWords.length > 1 && (
                            <div className="flex flex-wrap gap-2 items-center">
                              <Tag className="h-4 w-4 text-muted-foreground self-center" />
                              {entry.moodWords.slice(1).map(word => (
                                <Badge key={word} variant="secondary" className="font-normal">{word}</Badge>
                              ))}
                            </div>
                          )}
                          {entry.activities && entry.activities.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                              <ListChecks className="h-4 w-4 text-muted-foreground self-center" />
                              {entry.activities.map(activity => (
                                <Badge key={activity.id} variant="outline" className="font-normal">
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
                          {(!entry.moodWords || entry.moodWords.length <=1) && (!entry.activities || entry.activities.length ===0) && !entry.notes && (
                             <p className="text-sm text-muted-foreground">No specific details logged for this entry.</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-8">No entries match your current filters. Try adjusting them!</p>
        )}
      </CardContent>
    </Card>
  );
}
