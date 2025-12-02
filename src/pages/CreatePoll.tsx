import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, ArrowLeft, Upload, Image as ImageIcon, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CreatePoll() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const availableTags = ["Tech", "Fashion", "Food", "College", "Music", "Sports", "Gaming", "Movies"];

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isImage && !isVideo) {
        toast({
          title: t("createPoll.error"),
          description: "Only images and videos are allowed",
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: t("createPoll.error"),
          description: "File size must be less than 50MB",
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    if (mediaFiles.length + validFiles.length > 4) {
      toast({
        title: t("createPoll.error"),
        description: "Maximum 4 media files allowed",
        variant: "destructive",
      });
      return;
    }
    
    setMediaFiles([...mediaFiles, ...validFiles]);
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: t("createPoll.error"),
        description: "Please enter a poll title",
        variant: "destructive",
      });
      return;
    }

    const filledOptions = options.filter((opt) => opt.trim());
    if (filledOptions.length < 2) {
      toast({
        title: t("createPoll.error"),
        description: t("createPoll.minOptions"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to create polls",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          title: title.trim(),
          body: body.trim() || null,
          author_id: user.id,
          is_anonymous: isAnonymous,
          allow_comments: allowComments,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create poll options
      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(
          filledOptions.map((label, index) => ({
            poll_id: poll.id,
            label: label.trim(),
            display_order: index,
          }))
        );

      if (optionsError) throw optionsError;

      // Add tags
      if (selectedTags.length > 0) {
        const { data: tags } = await supabase
          .from("tags")
          .select("id, label")
          .in("label", selectedTags);

        if (tags && tags.length > 0) {
          await supabase.from("poll_tags").insert(
            tags.map((tag) => ({
              poll_id: poll.id,
              tag_id: tag.id,
            }))
          );
        }
      }

      // Upload media files
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${poll.id}/${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from("poll-media")
            .upload(fileName, file);

          if (uploadError) {
            console.error("Error uploading file:", uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("poll-media")
            .getPublicUrl(fileName);

          // Get media dimensions for images/videos
          const mediaType = file.type.startsWith("image/") ? "image" : "video";
          
          await supabase.from("media_assets").insert({
            poll_id: poll.id,
            storage_path: fileName,
            url: publicUrl,
            type: mediaType,
          });
        }
      }

      toast({
        title: t("createPoll.success"),
        description: t("createPoll.pollCreated"),
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error creating poll:", error);
      toast({
        title: t("createPoll.error"),
        description: error.message || t("createPoll.failedToCreate"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-subtle">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("createPoll.cancel")}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{t("createPoll.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t("createPoll.pollTitle")} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("createPoll.pollTitlePlaceholder")}
                  maxLength={120}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/120 characters
                </p>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Description (optional)</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Add more context..."
                  rows={3}
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <Label>{t("createPoll.option")} *</Label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`${t("createPoll.option")} ${index + 1}`}
                      maxLength={60}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createPoll.addOption")}
                  </Button>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>{t("createPoll.tags")}</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Media Upload */}
              <div>
                <Label>{t("createPoll.media")}</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-smooth">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{t("createPoll.uploadMedia")}</span>
                      </div>
                    </label>
                  </div>
                  
                  {mediaFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaFiles.map((file, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-border">
                          <div className="aspect-video bg-muted flex items-center justify-center">
                            {file.type.startsWith("image/") ? (
                              <>
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt="Preview" 
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              </>
                            ) : (
                              <Video className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMediaFile(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-smooth"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-1 truncate">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="anonymous">{t("createPoll.postAnonymously")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("createPoll.anonymousDesc")}
                    </p>
                  </div>
                  <Switch
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="comments">Allow comments</Label>
                    <p className="text-xs text-muted-foreground">
                      Let people discuss this poll
                    </p>
                  </div>
                  <Switch
                    id="comments"
                    checked={allowComments}
                    onCheckedChange={setAllowComments}
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                size="lg"
              >
                {loading ? "Creating..." : t("createPoll.createPoll")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
