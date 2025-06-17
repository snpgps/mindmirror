"use client";
import type { Patient } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, ChevronRight } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  selectedPatientId?: string;
}

export function PatientList({ patients, onSelectPatient, selectedPatientId }: PatientListProps) {
  if (patients.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Your Patients</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No patients are currently linked to your account.</p>
          <p className="text-sm text-muted-foreground mt-1">Share your Doctor Code with patients to link accounts.</p>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Your Patients ({patients.length})</CardTitle>
        <CardDescription>Select a patient to view their mood logs.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] lg:h-[calc(100vh-20rem)] pr-3"> {/* Adjust height as needed */}
          <ul className="space-y-3">
            {patients.map(patient => (
              <li key={patient.id}>
                <button
                  onClick={() => onSelectPatient(patient)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors border
                              ${selectedPatientId === patient.id 
                                ? 'bg-primary/10 border-primary text-primary' 
                                : 'hover:bg-muted/50 border-border'}`}
                  aria-current={selectedPatientId === patient.id ? "page" : undefined}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(patient.name)}`} alt={patient.name} data-ai-hint="avatar profile" />
                    <AvatarFallback>{getInitials(patient.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground">
                      {patient.email}
                    </p>
                  </div>
                  <ChevronRight className={`h-5 w-5 transition-transform ${selectedPatientId === patient.id ? 'text-primary': 'text-muted-foreground'}`} />
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
