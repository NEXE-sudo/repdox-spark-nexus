import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, X, GripVertical, Upload, Image as ImageIcon } from 'lucide-react';

// Suggested tags based on common event categories
const SUGGESTED_TAGS = [
  'Technology', 'Innovation', 'AI/ML', 'Blockchain', 'Web Development',
  'Mobile Apps', 'Gaming', 'Design', 'UI/UX', 'Prizes', 'Networking',
  'Workshop', 'Beginner Friendly', 'Open Source', 'Hardware', 'IoT',
  'Data Science', 'Cybersecurity', 'Cloud Computing', 'Startup'
];

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function AddEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    type: 'Hackathon',
    format: 'Offline',
    start_at: '',
    end_at: '',
    registration_deadline: '',
    location: '',
    short_blurb: '',
    long_description: '',
    overview: '',
    rules: '',
    registration_link: '',
    discord_invite: '',
    instagram_handle: ''
  });
  
  const [scheduleText, setScheduleText] = useState('');
  const [teamsText, setTeamsText] = useState('');
  const [prizeText, setPrizeText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // FAQ state management
  const [faqs, setFaqs] = useState<FAQ[]>([{ id: '1', question: '', answer: '' }]);
  const [draggedFaq, setDraggedFaq] = useState<string | null>(null);

  // Tag state management
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  const onChange = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  // FAQ handlers
  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now().toString(), question: '', answer: '' }]);
  };

  const removeFaq = (id: string) => {
    if (faqs.length > 1) {
      setFaqs(faqs.filter(f => f.id !== id));
    }
  };

  const updateFaq = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs(faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleDragStart = (id: string) => {
    setDraggedFaq(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedFaq || draggedFaq === id) return;

    const draggedIndex = faqs.findIndex(f => f.id === draggedFaq);
    const targetIndex = faqs.findIndex(f => f.id === id);

    const newFaqs = [...faqs];
    const [removed] = newFaqs.splice(draggedIndex, 1);
    newFaqs.splice(targetIndex, 0, removed);
    setFaqs(newFaqs);
  };

  const handleDragEnd = () => {
    setDraggedFaq(null);
  };

  // Tag handlers
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value.trim()) {
      const filtered = SUGGESTED_TAGS.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase()) && 
        !tags.includes(tag)
      );
      setFilteredSuggestions(filtered);
      setShowTagSuggestions(true);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    // Check for duplicates (case-insensitive)
    const duplicate = tags.find(t => t.toLowerCase() === trimmedTag.toLowerCase());
    if (duplicate) {
      toast({ 
        title: 'Duplicate tag', 
        description: `"${duplicate}" already exists. Try a different tag.`,
        variant: 'destructive'
      });
      return;
    }

    setTags([...tags, trimmedTag]);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  // Image handlers
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setImageFile(f);
    
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setImagePreview(null);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({ title: 'Sign in required', description: 'Please sign in to create events.' });
        setLoading(false);
        return;
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `events/${form.slug || form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('events').upload(fileName, imageFile, { upsert: true });
        if (upErr) throw upErr;
        imageUrl = fileName;
      }

      const endAt = form.end_at || new Date(new Date(form.start_at).getTime() + 2 * 60 * 60 * 1000).toISOString();
      const registrationDeadline = form.registration_deadline || new Date(new Date(form.start_at).getTime() - 24 * 60 * 60 * 1000).toISOString();

      const prizes = prizeText.split('\n').map(l => l.trim()).filter(Boolean);
      
      // Filter out empty FAQs
      const validFaqs = faqs
        .filter(faq => faq.question.trim() && faq.answer.trim())
        .map(({ question, answer }) => ({ question, answer }));

      const { data, error } = await supabase.from('events').insert({
        title: form.title,
        slug: form.slug || form.title.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        type: form.type as 'Hackathon' | 'Workshop' | 'MUN' | 'Gaming',
        format: form.format as 'Online' | 'Offline' | 'Hybrid',
        start_at: form.start_at,
        end_at: endAt,
        registration_deadline: registrationDeadline,
        location: form.location,
        short_blurb: form.short_blurb || form.title,
        long_description: form.long_description || null,
        overview: form.overview || null,
        image_url: imageUrl,
        tags: tags.length > 0 ? tags : null,
        rules: form.rules || null,
        prizes: prizes.length > 0 ? prizes : null,
        faqs: validFaqs.length > 0 ? validFaqs : null,
        registration_link: form.registration_link || null,
        discord_invite: form.discord_invite || null,
        instagram_handle: form.instagram_handle || null,
        is_active: true
      }).select('*').single();

      if (error) throw error;

      if (scheduleText.trim()) {
        const scheduleLines = scheduleText.split('\n').map(l => l.trim()).filter(Boolean);
        const scheduleInserts = scheduleLines.map(line => {
          const parts = line.split('|').map(p => p.trim());
          return {
            event_id: data.id,
            start_at: parts[0] || null,
            title: parts[1] || parts[0] || 'Schedule item',
            description: parts[2] || null
          };
        });
        const { error: schedErr } = await supabase.from('event_schedules').insert(scheduleInserts);
        if (schedErr) throw schedErr;
      }

      if (teamsText.trim()) {
        const teamLines = teamsText.split('\n').map(l => l.trim()).filter(Boolean);
        const teamInserts = teamLines.map(line => {
          const parts = line.split('|').map(p => p.trim());
          return {
            event_id: data.id,
            name: parts[0],
            description: parts[1] || null,
            contact_email: parts[2] || null
          };
        });
        const { error: teamErr } = await supabase.from('event_teams').insert(teamInserts);
        if (teamErr) throw teamErr;
      }

      toast({ title: 'Event created', description: 'Your event was created successfully.' });
      navigate(`/events/${data.slug}`);
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err && typeof (err as Record<string, unknown>).message === 'string'
        ? ((err as Record<string, unknown>).message as string)
        : String(err);
      toast({ title: 'Error', description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create Event</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => onChange('title', e.target.value)} required />
          </div>
          
          <div>
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input id="slug" value={form.slug} onChange={(e) => onChange('slug', e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => onChange('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hackathon">Hackathon</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="MUN">MUN</SelectItem>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={form.format} onValueChange={(v) => onChange('format', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start At</Label>
              <Input type="datetime-local" value={form.start_at} onChange={(e) => onChange('start_at', e.target.value)} required />
            </div>
            <div>
              <Label>End At</Label>
              <Input type="datetime-local" value={form.end_at} onChange={(e) => onChange('end_at', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Registration Deadline</Label>
            <Input type="datetime-local" value={form.registration_deadline} onChange={(e) => onChange('registration_deadline', e.target.value)} />
          </div>

          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => onChange('location', e.target.value)} required />
          </div>

          <div>
            <Label>Short Blurb (required)</Label>
            <Input value={form.short_blurb} onChange={(e) => onChange('short_blurb', e.target.value)} required />
          </div>

          <div>
            <Label>Long Description</Label>
            <Textarea value={form.long_description} onChange={(e) => onChange('long_description', e.target.value)} rows={4} />
          </div>

          <div>
            <Label>Overview / Summary</Label>
            <Textarea value={form.overview} onChange={(e) => onChange('overview', e.target.value)} rows={4} />
          </div>

          <div>
            <Label>Rules</Label>
            <Textarea value={form.rules} onChange={(e) => onChange('rules', e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Prizes (one per line)</Label>
            <Textarea value={prizeText} onChange={(e) => setPrizeText(e.target.value)} rows={3} placeholder="1st Prize - ₹10,000&#10;2nd Prize - ₹5,000&#10;3rd Prize - ₹2,500" />
          </div>

          {/* Revamped FAQ Section */}
          <div>
            <Label className="text-base font-semibold mb-3 block">FAQs</Label>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <Card 
                  key={faq.id}
                  draggable
                  onDragStart={() => handleDragStart(faq.id)}
                  onDragOver={(e) => handleDragOver(e, faq.id)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-move transition-all ${draggedFaq === faq.id ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Question {index + 1}</span>
                          {faqs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFaq(faq.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Enter your question"
                          value={faq.question}
                          onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                        />
                        <Textarea
                          placeholder="Enter the answer"
                          value={faq.answer}
                          onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addFaq}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          {/* Revamped Tags Section */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Tags</Label>
            <div className="space-y-3">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="relative">
                <Input
                  placeholder="Type to search or add new tags..."
                  value={tagInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onFocus={() => tagInput && setShowTagSuggestions(true)}
                />
                
                {showTagSuggestions && filteredSuggestions.length > 0 && (
                  <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {filteredSuggestions.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addTag(tag)}
                            className="w-full text-left px-3 py-2 hover:bg-accent rounded-md text-sm transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Press Enter to add a tag or select from suggestions
              </div>
            </div>
          </div>

          <div>
            <Label>Schedule (Format: YYYY-MM-DDTHH:MM | Title | Description, one per line)</Label>
            <Textarea value={scheduleText} onChange={(e) => setScheduleText(e.target.value)} rows={4} placeholder="2025-03-15T09:00 | Opening Ceremony | Welcome address&#10;2025-03-15T10:00 | Event Kickoff | Rules and guidelines" />
          </div>

          <div>
            <Label>Teams (Format: Name | Description | contact_email, one per line)</Label>
            <Textarea value={teamsText} onChange={(e) => setTeamsText(e.target.value)} rows={3} placeholder="Organizers | Main event team | contact@example.com&#10;Volunteers | Helper team | volunteers@example.com" />
          </div>

          <div>
            <Label>Registration Link</Label>
            <Input value={form.registration_link} onChange={(e) => onChange('registration_link', e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <Label>Discord Invite Link</Label>
            <Input value={form.discord_invite} onChange={(e) => onChange('discord_invite', e.target.value)} placeholder="https://discord.gg/..." />
          </div>

          <div>
            <Label>Instagram Handle</Label>
            <Input value={form.instagram_handle} onChange={(e) => onChange('instagram_handle', e.target.value)} placeholder="@handle" />
          </div>

          {/* Revamped Image Upload */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Event Image</Label>
            {imagePreview ? (
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={clearImage}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{imageFile?.name}</p>
                </CardContent>
              </Card>
            ) : (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  className="hidden"
                />
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-2 border-dashed">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="bg-primary/10 rounded-full p-4 mb-4">
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-medium mb-1">Click to upload event image</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, or WEBP (max 5MB)</p>
                    <Button type="button" variant="secondary" size="sm" className="mt-4">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </CardContent>
                </Card>
              </label>
            )}
          </div>

          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}