
"use client";
import React, { useState } from 'react';
import type { MoodEntry, Activity } from '@/lib/types';
import { EMOTION_HIERARCHY, PREDEFINED_ACTIVITIES, ALL_EMOTION_WORDS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, Tag, ListChecks, Filter, X, CircleDot, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface MoodTimelineProps {
  entries: MoodEntry[];
}

export function MoodTimeline({ entries }: MoodTimelineProps) {
  const [selectedMoodWordsFilter, setSelectedMoodWordsFilter] = useState<string[]>([]);
  const [selectedActivitiesFilter, setSelectedActivitiesFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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
    
    let dateMatch = true;
    if (dateRange?.from) {
      const entryDate = parseISO(entry.timestamp);
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date()); 
      
      if (dateRange.to) {
        dateMatch = isWithinInterval(entryDate, { start: from, end: to });
      } else {
         dateMatch = entryDate >= from;
      }
    }
    
    return moodWordMatch && activityMatch && dateMatch;
  }).sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  const clearFilters = () => {
    setSelectedMoodWordsFilter([]);
    setSelectedActivitiesFilter([]);
    setDateRange(undefined);
  };
  
  const activeFilterCount = [
    selectedMoodWordsFilter.length > 0,
    selectedActivitiesFilter.length > 0,
    !!dateRange?.from
  ].filter(Boolean).length;

  const getCoreEmotionStyle = (moodWords: string[]): { name: string, badgeClassName: string, dotClassName: string } => {
    if (!moodWords || moodWords.length === 0) {
      return { name: "Mood", badgeClassName: "bg-muted text-muted-foreground border-border", dotClassName: "bg-muted-foreground" };
    }
    const firstWord = moodWords[0];
    for (const coreKey in EMOTION_HIERARCHY) {
      if (EMOTION_HIERARCHY[coreKey].name === firstWord) {
        const coreEmotionDetails = EMOTION_HIERARCHY[coreKey];
        const colorClassParts = coreEmotionDetails.colorClass.split(' ');
        const baseBgClass = colorClassParts.find(cls => cls.startsWith('bg-')) || 'bg-gray-500';
        const explicitTextColorClass = colorClassParts.find(cls => cls.startsWith('text-')) || 'text-white';
        const baseColorName = baseBgClass.split('-')[1]; 

        const dotClassName = baseBgClass;

        let badgeBgClass = `bg-${baseColorName}-100`;
        let badgeTextColorClass = `text-${baseColorName}-700`;
        let badgeBorderColorClass = `border-${baseColorName}-200`;

        if (explicitTextColorClass !== 'text-white' && !explicitTextColorClass.startsWith('text-gray')) {
           badgeTextColorClass = explicitTextColorClass; // Use explicit if not white and not generic gray
        } else if (explicitTextColorClass.startsWith('text-gray')) {
           badgeTextColorClass = `text-gray-800`; // Ensure dark gray for yellow-like backgrounds
        }


        let darkBadgeBgClass = `dark:bg-${baseColorName}-800/60`;
        let darkBadgeTextColorClass = `dark:text-${baseColorName}-200`;
        let darkBadgeBorderColorClass = `dark:border-${baseColorName}-700`;

        if (badgeTextColorClass.includes('gray-800') || badgeTextColorClass.includes('black')) {
           darkBadgeTextColorClass = `dark:text-${baseColorName}-100`; // Lighter text for dark themes if original light theme text was very dark
        }
        
        return {
          name: coreEmotionDetails.name,
          badgeClassName: `${badgeBgClass} ${badgeTextColorClass} ${badgeBorderColorClass} ${darkBadgeBgClass} ${darkBadgeTextColorClass} ${darkBadgeBorderColorClass}`,
          dotClassName: dotClassName
        };
      }
    }
    return { name: firstWord || "Mood", badgeClassName: "bg-muted text-muted-foreground border-border", dotClassName: "bg-muted-foreground" };
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
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> 
                  Filter ({activeFilterCount > 0 ? `${activeFilterCount} active, ` : ''}{filteredEntries.length} / {entries.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 md:w-96">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter by Date Range</h4>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date range</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                        />
                        </PopoverContent>
                    </Popover>
                  </div>

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
                  {activeFilterCount > 0 && (
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
          <ScrollArea className="h-[500px] pr-3"> {/* pr-3 for scrollbar visibility */}
            <div className="relative py-2"> {/* Container for the line and all entries. py-2 for minor top/bottom spacing. */}
              {/* The main timeline vertical bar. Positioned 1.5rem (24px) from the left. */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
              
              {filteredEntries.map((entry) => {
                const coreEmotionStyle = getCoreEmotionStyle(entry.moodWords);
                return (
                  // Each entry item:
                  // ml-6 (1.5rem) to align with the line's position.
                  // pl-8 (2rem) to create space between the line/dot area and the card content.
                  <div key={entry.id} className="relative ml-6 pl-8 pb-8 last:pb-0">
                    {/* Dot on the timeline:
                        - left-0 positions it at the start of its 'ml-6 pl-8' parent.
                        - -translate-x-1/2 centers the dot on this 'left-0' mark.
                          Effectively, this centers the dot over the main vertical line (which is at left-6 of the outer container).
                        - z-10 ensures the dot is above the line.
                    */}
                    <div className={cn(
                      "absolute left-0 top-[5px] h-5 w-5 rounded-full border-4 border-background -translate-x-1/2 z-10",
                      coreEmotionStyle.dotClassName
                    )}></div>
                    
                    <div className="pt-0.5"> {/* Minor adjustment for card alignment relative to dot */}
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

