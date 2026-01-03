import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ChevronRight, ChevronLeft, MapPin, User, Calendar, Briefcase, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const SKILLS = [
  { id: 'first_aid', label: 'First Aid', category: 'Medical' },
  { id: 'cpr', label: 'CPR Certified', category: 'Medical' },
  { id: 'emt', label: 'EMT/Paramedic', category: 'Medical' },
  { id: 'nursing', label: 'Nursing', category: 'Medical' },
  { id: 'search_rescue', label: 'Search & Rescue', category: 'Field' },
  { id: 'firefighting', label: 'Firefighting', category: 'Field' },
  { id: 'water_rescue', label: 'Water Rescue', category: 'Field' },
  { id: 'climbing', label: 'Climbing/Rope Work', category: 'Field' },
  { id: 'driving', label: 'Licensed Driver', category: 'Logistics' },
  { id: 'heavy_equipment', label: 'Heavy Equipment', category: 'Logistics' },
  { id: 'radio_comms', label: 'Radio Communications', category: 'Logistics' },
  { id: 'translation', label: 'Translation Services', category: 'Logistics' },
  { id: 'counseling', label: 'Crisis Counseling', category: 'Support' },
  { id: 'childcare', label: 'Childcare', category: 'Support' },
  { id: 'animal_care', label: 'Animal Care', category: 'Support' },
  { id: 'cooking', label: 'Mass Cooking', category: 'Support' },
];

const DAYS = [
  { id: 'monday', label: 'Mon', full: 'Monday' },
  { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { id: 'thursday', label: 'Thu', full: 'Thursday' },
  { id: 'friday', label: 'Fri', full: 'Friday' },
  { id: 'saturday', label: 'Sat', full: 'Saturday' },
  { id: 'sunday', label: 'Sun', full: 'Sunday' },
];

const TIME_SLOTS = [
  { id: 'morning', label: '06:00-12:00', display: 'Morning' },
  { id: 'afternoon', label: '12:00-18:00', display: 'Afternoon' },
  { id: 'evening', label: '18:00-00:00', display: 'Evening' },
  { id: 'night', label: '00:00-06:00', display: 'Night' },
];

interface OnboardingData {
  fullName: string;
  bitchatUsername: string;
  phone: string;
  email: string;
  skills: string[];
  availability: Record<string, string[]>;
  location: {
    address: string;
    lat: number;
    lon: number;
  } | null;
}

const STEPS = [
  { id: 1, title: 'Profile', icon: User },
  { id: 2, title: 'Skills', icon: Briefcase },
  { id: 3, title: 'Availability', icon: Calendar },
  { id: 4, title: 'Location', icon: MapPin },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const createVolunteer = useMutation(api.volunteers.create);

  const [data, setData] = useState<OnboardingData>({
    fullName: '',
    bitchatUsername: '',
    phone: '',
    email: '',
    skills: [],
    availability: {},
    location: null,
  });

  const toggleSkill = (skillId: string) => {
    setData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter((s) => s !== skillId)
        : [...prev.skills, skillId],
    }));
  };

  const toggleAvailability = (day: string, slot: string) => {
    setData((prev) => {
      const daySlots = prev.availability[day] || [];
      const newSlots = daySlots.includes(slot)
        ? daySlots.filter((s) => s !== slot)
        : [...daySlots, slot];

      return {
        ...prev,
        availability: {
          ...prev.availability,
          [day]: newSlots,
        },
      };
    });
  };

  const setAllDay = (day: string) => {
    setData((prev) => {
      const daySlots = prev.availability[day] || [];
      const allSlots = TIME_SLOTS.map((t) => t.label);
      const hasAll = allSlots.every((s) => daySlots.includes(s));

      return {
        ...prev,
        availability: {
          ...prev.availability,
          [day]: hasAll ? [] : allSlots,
        },
      };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.fullName.trim() && data.bitchatUsername.trim();
      case 2:
        return data.skills.length > 0;
      case 3:
        return Object.values(data.availability).some((slots) => slots.length > 0);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await createVolunteer({
        full_name: data.fullName,
        bitchat_username: data.bitchatUsername,
        phone: data.phone || undefined,
        email: data.email || undefined,
        skills: data.skills,
        availability_schedule: data.availability,
        current_status: 'online',
        location: data.location || undefined,
      });

      navigate('/');
    } catch (err) {
      setError('Failed to complete setup. Please try again.');
      console.error('Onboarding error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Complete Your Profile</h1>
            <p className="text-sm text-muted-foreground">
              Step {step} of {STEPS.length}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;

            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isCurrent && "border-primary text-primary",
                      !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
                    )}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2 font-medium",
                      isCurrent && "text-primary",
                      !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4",
                      step > s.id ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Tell us about yourself so we can match you with the right tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={data.fullName}
                  onChange={(e) => setData({ ...data, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bitchat">Communication Handle *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="bitchat"
                    className="pl-8"
                    placeholder="your_handle"
                    value={data.bitchatUsername}
                    onChange={(e) =>
                      setData({ ...data, bitchatUsername: e.target.value.replace('@', '') })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your unique identifier for mesh network communications
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Skills */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Skills & Capabilities</CardTitle>
              <CardDescription>
                Select all the skills and certifications you have. This helps us match you with appropriate tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {['Medical', 'Field', 'Logistics', 'Support'].map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SKILLS.filter((s) => s.category === category).map((skill) => {
                      const isSelected = data.skills.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-colors",
                            isSelected
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-background border-input hover:bg-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="truncate">{skill.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{data.skills.length} skills</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Availability */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Availability</CardTitle>
              <CardDescription>
                Let us know when you're typically available to respond to incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left text-sm font-medium text-muted-foreground py-3 pr-4">
                        Day
                      </th>
                      {TIME_SLOTS.map((slot) => (
                        <th
                          key={slot.id}
                          className="text-center text-sm font-medium text-muted-foreground py-3 px-2"
                        >
                          <div>{slot.display}</div>
                          <div className="text-xs font-normal">{slot.label}</div>
                        </th>
                      ))}
                      <th className="text-center text-sm font-medium text-muted-foreground py-3 pl-4">
                        All Day
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day) => {
                      const daySlots = data.availability[day.id] || [];
                      const allSelected = TIME_SLOTS.every((t) => daySlots.includes(t.label));

                      return (
                        <tr key={day.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <span className="text-sm font-medium">{day.full}</span>
                          </td>
                          {TIME_SLOTS.map((slot) => {
                            const isSelected = daySlots.includes(slot.label);
                            return (
                              <td key={slot.id} className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleAvailability(day.id, slot.label)}
                                  className={cn(
                                    "w-10 h-10 rounded-lg border transition-colors",
                                    isSelected
                                      ? "bg-primary border-primary"
                                      : "bg-background border-input hover:bg-muted"
                                  )}
                                >
                                  {isSelected && <Check className="w-4 h-4 text-primary-foreground mx-auto" />}
                                </button>
                              </td>
                            );
                          })}
                          <td className="py-3 pl-4 text-center">
                            <Button
                              type="button"
                              variant={allSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAllDay(day.id)}
                            >
                              24h
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-4 border-t flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-input bg-background" />
                  <span>Not available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Location</CardTitle>
                <CardDescription>
                  Optional — helps us match you with nearby incidents for faster response
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">City or Address</Label>
                  <Input
                    id="address"
                    placeholder="e.g., San Francisco, CA"
                    value={data.location?.address || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        location: e.target.value
                          ? { address: e.target.value, lat: 0, lon: 0 }
                          : null,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Your exact address is never shared with other volunteers
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Why share your location?</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Get matched to incidents near you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Help coordinators optimize response times</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>You can skip this and add it later</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Profile Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{data.fullName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Handle:</span>{' '}
                    <span className="font-medium">@{data.bitchatUsername}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skills:</span>{' '}
                    <span className="font-medium">{data.skills.length} selected</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Availability:</span>{' '}
                    <span className="font-medium">
                      {Object.values(data.availability).filter((s) => s.length > 0).length} days/week
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {step < STEPS.length ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
