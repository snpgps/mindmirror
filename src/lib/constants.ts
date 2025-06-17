import type { MoodOption, Activity } from './types';
import { Smile, Frown, Meh, Annoyed, Cloudy, Briefcase, Dumbbell, BookOpen, Users, Coffee, Bed, Utensils, Brain } from 'lucide-react';

export const MOOD_OPTIONS: MoodOption[] = [
  { level: 1, emoji: "😔", label: "Very Sad" },
  { level: 2, emoji: "🙁", label: "Sad" },
  { level: 3, emoji: "😐", label: "Neutral" },
  { level: 4, emoji: "🙂", label: "Happy" },
  { level: 5, emoji: "😊", label: "Very Happy" },
];

export const EMOJI_DETAILS: { [key in MoodLevel]: { emoji: string; label: string; colorClass: string } } = {
  1: { emoji: "😭", label: "Awful", colorClass: "text-red-500"},
  2: { emoji: "😔", label: "Bad", colorClass: "text-orange-500"},
  3: { emoji: "😐", label: "Okay", colorClass: "text-yellow-500"},
  4: { emoji: "🙂", label: "Good", colorClass: "text-lime-500"},
  5: { emoji: "😄", label: "Great", colorClass: "text-green-500"},
};


export const MOOD_WORDS: string[] = [
  "Stressed", "Anxious", "Overwhelmed", "Calm", "Relaxed", "Peaceful", "Excited", "Joyful", "Hopeful", "Tired", "Fatigued", "Energetic", "Grateful", "Content", "Lonely", "Frustrated", "Irritable", "Focused", "Productive", "Motivated"
];

export const PREDEFINED_ACTIVITIES: Activity[] = [
  { id: "work", name: "Work", icon: Briefcase },
  { id: "exercise", name: "Exercise", icon: Dumbbell },
  { id: "reading", name: "Reading", icon: BookOpen },
  { id: "socializing", name: "Socializing", icon: Users },
  { id: "hobbies", name: "Hobbies", icon: Coffee }, // Placeholder, could be more specific
  { id: "resting", name: "Resting", icon: Bed },
  { id: "eating", name: "Eating Well", icon: Utensils },
  { id: "mindfulness", name: "Mindfulness", icon: Brain },
];
