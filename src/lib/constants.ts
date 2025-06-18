
import type { Activity } from './types';
import { Briefcase, Dumbbell, BookOpen, Users as UsersIcon, Coffee, Bed, Utensils, Brain } from 'lucide-react';

export interface EmotionNode {
  name: string;
  children?: Record<string, EmotionNode>; // For primary emotions
}

export interface CoreEmotionData {
  name: string;
  colorClass: string; // Tailwind class for background/text
  icon?: React.ElementType; // Optional: for core emotion button
  primaryEmotions: Record<string, { // Key is ID-like (e.g., PEACEFUL)
    name: string;
    secondaryEmotions?: string[]; // List of secondary emotion names
  }>;
}

export const EMOTION_HIERARCHY: Record<string, CoreEmotionData> = {
  HAPPY: {
    name: "Happy",
    colorClass: "bg-green-500 hover:bg-green-600 text-white",
    primaryEmotions: {
      PEACEFUL: { name: "Peaceful", secondaryEmotions: ["Curious", "Inquisitive"] },
      INTERESTED: { name: "Interested" },
      CONTENT: { name: "Content", secondaryEmotions: ["Open", "Sensitive"] },
      JOYFUL: { name: "Joyful" }, // Links to Content, Open, Sensitive which are covered
      PROUD: { name: "Proud", secondaryEmotions: ["Confident", "Relieved", "Important"] },
      ACCEPTED: { name: "Accepted", secondaryEmotions: ["Fulfilled"] },
      ENTHUSIASTIC: { name: "Enthusiastic", secondaryEmotions: ["Thrilled", "Respected", "Passionate"] },
      OPTIMISTIC: { name: "Optimistic", secondaryEmotions: ["Hopeful", "Inspired"] },
      EXCITED: { name: "Excited", secondaryEmotions: ["Energetic", "Eager", "Awestruck", "Thrown", "No Words", "Confused"] },
      LOVING: { name: "Loving" },
      THANKFUL: { name: "Thankful" },
    }
  },
  SAD: {
    name: "Sad",
    colorClass: "bg-blue-500 hover:bg-blue-600 text-white",
    primaryEmotions: {
      LONELY: { name: "Lonely", secondaryEmotions: ["Abandoned", "Left Out"] },
      GUILTY: { name: "Guilty", secondaryEmotions: ["Ashamed", "Remorseful", "Powerless"] },
      DEPRESSED: { name: "Depressed", secondaryEmotions: ["Empty", "Undervalued", "Grief"] },
      HURT: { name: "Hurt", secondaryEmotions: ["Disappointed", "Forgotten", "In My Feelings"] },
      TIRED: { name: "Tired", secondaryEmotions: ["Numb", "Don't Care"] }
    }
  },
  DISGUSTED: {
    name: "Disgusted",
    colorClass: "bg-orange-500 hover:bg-orange-600 text-white",
    primaryEmotions: {
      AVOIDING: { name: "Avoiding", secondaryEmotions: ["Repelled", "Hesitant"] },
      AWFUL: { name: "Awful", secondaryEmotions: ["Nauseated", "Detest", "Appalled"] },
      OUTRAGED: { name: "Outraged", secondaryEmotions: ["Uncomfortable", "Judgmental", "Loathing", "Embarrassed", "Ridiculed"] }
    }
  },
  MAD: {
    name: "Mad",
    colorClass: "bg-red-500 hover:bg-red-600 text-white",
    primaryEmotions: {
      LET_DOWN: { name: "Let Down", secondaryEmotions: ["Salty", "Bitter"] },
      HUMILIATED: { name: "Humiliated", secondaryEmotions: ["Disrespected", "Not Heard"] },
      ANGRY: { name: "Angry", secondaryEmotions: ["Frustrated", "Hateful", "Betrayed", "Violated"] },
      AGGRESSIVE: { name: "Aggressive", secondaryEmotions: ["Offended", "Resentful", "Hostile"] },
      FURIOUS: { name: "Furious", secondaryEmotions: ["Rage", "Heated", "Annoyed"] },
      WEAK: { name: "Weak", secondaryEmotions: ["Worthless", "Skeptical", "Insulted"] }, // Worthless, Skeptical can be cross-listed
      NERVOUS: { name: "Nervous", secondaryEmotions: ["Panicked", "Provoked"] } // Panicked can be cross-listed
    }
  },
  SCARED: {
    name: "Scared",
    colorClass: "bg-purple-500 hover:bg-purple-600 text-white",
    primaryEmotions: {
      FEARFUL: { name: "Fearful", secondaryEmotions: ["Terrified", "Threatened"] },
      ANXIOUS: { name: "Anxious", secondaryEmotions: ["Worried", "Overwhelmed", "Uneasy"] },
      INSECURE: { name: "Insecure", secondaryEmotions: ["Inadequate", "Inferior", "Excluded", "Alienated", "Vulnerable"] },
      REJECTED: { name: "Rejected" , secondaryEmotions: ["Worthless"]}, // Worthless can be cross-listed
      STRESSED: { name: "Stressed" } // Added from common list
    }
  },
  SURPRISED: {
    name: "Surprised",
    colorClass: "bg-yellow-400 hover:bg-yellow-500 text-gray-800",
    primaryEmotions: {
      STARTLED: { name: "Startled", secondaryEmotions: ["Shook", "Stunned"] },
      AMAZED: { name: "Amazed", secondaryEmotions: ["Astonished", "Awestruck"] }, // Awestruck can be cross-listed
      CONFUSED: { name: "Confused" } // From Happy/Excited originally, but fits Surprised well
    }
  }
};

// Helper to get all unique emotion names for filtering, etc.
export const ALL_EMOTION_WORDS: string[] = Array.from(new Set(
  Object.values(EMOTION_HIERARCHY).flatMap(core => [
    core.name,
    ...Object.values(core.primaryEmotions).flatMap(primary => [
      primary.name,
      ...(primary.secondaryEmotions || [])
    ])
  ])
));


export const PREDEFINED_ACTIVITIES: Activity[] = [
  { id: "work", name: "Work", icon: Briefcase },
  { id: "exercise", name: "Exercise", icon: Dumbbell },
  { id: "reading", name: "Reading", icon: BookOpen },
  { id: "socializing", name: "Socializing", icon: UsersIcon },
  { id: "hobbies", name: "Hobbies", icon: Coffee },
  { id: "resting", name: "Resting", icon: Bed },
  { id: "eating", name: "Eating Well", icon: Utensils },
  { id: "mindfulness", name: "Mindfulness", icon: Brain },
];
