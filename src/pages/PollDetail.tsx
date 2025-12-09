import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageCircle, Share2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollOption {
  id: string;
  label: string;
  display_order: number;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  author_user_id: string | null;
  author_guest_id: string | null;
  author?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface Poll {
  id: string;
  title: string;
  body: string | null;
  is_anonymous: boolean;
  allow_comments: boolean;
  created_at: string;
  author_id: string | null;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  poll_options: PollOption[];
  poll_tags: Array<{
    tags: {
      label: string;
    };
  }>;
  votes: Array<{
    option_id: string;
    voter_user_id: string | null;
    voter_guest_id: string | null;
  }>;
  comments: Comment[];
  media_assets: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

export default function PollDetail() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | undefined>();
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState(false);

  useEffect(() => {
    // Check auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (pollId) {
      loadPoll();
    }
  }, [pollId]);

  useEffect(() => {
    // Set selected option based on user's existing vote
    if (poll && user) {
      const existingVote = poll.votes.find(
        (v) => v.voter_user_id === user?.id
      );
      if (existingVote) {
        setSelectedOption(existingVote.option_id);
      }
    }
  }, [poll, user]);

  const loadPoll = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("polls")
      .select(`
        *,
        author:profiles!author_id(id, username, avatar_url),
        poll_options(*),
        poll_tags(tags(label)),
        votes(option_id, voter_user_id, voter_guest_id),
        comments(
          id,
          body,
          created_at,
          parent_id,
          author_user_id,
          author_guest_id,
          author:profiles!author_user_id(username, avatar_url)
        ),
        media_assets(id, type, url)
      `)
      .eq("id", pollId)
      .single();

    if (error) {
      console.error("Error loading poll:", error);
      toast({
        title: t("pollDetail.error"),
        description: t("pollDetail.failedToLoad"),
        variant: "destructive",
      });
      navigate("/");
    } else {
      // Sort options by display_order
      data.poll_options.sort((a: PollOption, b: PollOption) => a.display_order - b.display_order);
      // Sort comments by created_at (newest first)
      data.comments.sort((a: Comment, b: Comment) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPoll(data);
    }

    setLoading(false);
  };

  const handleVote = async (optionId: string) => {
    if (votingInProgress) return;
    
    // Require authentication to vote
    if (!user) {
      toast({
        title: t("pollDetail.signInRequired"),
        description: t("pollDetail.signInToVote"),
      });
      navigate("/auth");
      return;
    }
    
    // If already voted, don't allow changing
    if (selectedOption) {
      return;
    }

    setVotingInProgress(true);

    try {
      // Create new vote - explicitly set voter_guest_id to NULL to avoid constraint conflicts
      const { error } = await supabase.from("votes").insert({
        poll_id: pollId,
        option_id: optionId,
        voter_user_id: user.id,
        voter_guest_id: null,
      });

      if (error) {
        console.error("Error inserting vote:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Poll ID:", pollId, "Option ID:", optionId, "User ID:", user.id);
        throw error;
      }

      setSelectedOption(optionId);
      await loadPoll();
      
      toast({
        title: t("home.voteCast"),
        description: t("home.voteRecorded"),
      });
    } catch (error: any) {
      console.error("Error voting:", error);
      console.error("Error stack:", error?.stack);
      toast({
        title: t("home.error"),
        description: error.message || t("home.failedToVote"),
        variant: "destructive",
      });
    } finally {
      setVotingInProgress(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    if (!user) {
      toast({
        title: t("pollDetail.signInRequired"),
        description: t("pollDetail.signInToComment"),
      });
      navigate("/auth");
      return;
    }

    setSubmittingComment(true);

    try {
      const { error } = await supabase.from("comments").insert({
        poll_id: pollId,
        body: commentText.trim(),
        author_user_id: user.id,
      });

      if (error) throw error;

      setCommentText("");
      await loadPoll();

      toast({
        title: t("pollDetail.commentAdded"),
        description: t("pollDetail.commentSuccess"),
      });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: t("pollDetail.error"),
        description: error.message || t("pollDetail.failedToComment"),
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    const pollUrl = `${window.location.origin}/polls/${pollId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: poll?.title || "Check out this poll",
          text: `Vote on: ${poll?.title}`,
          url: pollUrl,
        });
      } catch (error) {
        // User cancelled or error occurred, fall back to clipboard
        copyToClipboard(pollUrl);
      }
    } else {
      copyToClipboard(pollUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t("pollDetail.linkCopied"),
        description: t("pollDetail.linkCopiedDesc"),
      });
    } catch (error) {
      toast({
        title: t("pollDetail.error"),
        description: t("pollDetail.failedToCopy"),
        variant: "destructive",
      });
    }
  };

  const getVoteCount = (optionId: string) => {
    return poll?.votes.filter((v) => v.option_id === optionId).length || 0;
  };

  const getTotalVotes = () => {
    return poll?.votes.length || 0;
  };

  const getPercentage = (optionId: string) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round((getVoteCount(optionId) / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">{t("pollDetail.notFound")}</div>
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const hasVoted = !!selectedOption;

  return (
    <div className="min-h-screen gradient-subtle">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-3 sm:mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back")}
        </Button>

        {/* Poll Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-2">
            {/* Author Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span
                className={cn(
                  "font-medium text-foreground",
                  !poll.is_anonymous && poll.author && "cursor-pointer hover:underline"
                )}
                onClick={() => {
                  if (!poll.is_anonymous && poll.author) {
                    navigate(`/profile/${poll.author.id}`);
                  }
                }}
              >
                {poll.is_anonymous ? t("pollCard.anonymous") : poll.author?.username || "Unknown"}
              </span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}</span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold">{poll.title}</h1>

            {/* Description */}
            {poll.body && (
              <p className="text-sm sm:text-base text-muted-foreground mt-2">{poll.body}</p>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Tags */}
            {poll.poll_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {poll.poll_tags.map((pt, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {pt.tags.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Media Assets */}
            {poll.media_assets.length > 0 && (
              <div className={cn(
                "grid gap-2",
                poll.media_assets.length === 1 ? "grid-cols-1" : "grid-cols-2"
              )}>
                {poll.media_assets.map((media) => (
                  <div key={media.id} className="rounded-lg overflow-hidden border border-border">
                    {media.type === "image" ? (
                      <img 
                        src={media.url} 
                        alt="Poll media" 
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                    ) : (
                      <video 
                        src={media.url} 
                        className="w-full h-48 sm:h-64 object-cover"
                        controls
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Poll Options */}
            <div className="space-y-2">
              {poll.poll_options.map((option) => {
                const percentage = getPercentage(option.id);
                const isSelected = selectedOption === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => !hasVoted && handleVote(option.id)}
                    disabled={hasVoted || votingInProgress}
                    className={cn(
                      "relative w-full rounded-lg border-2 p-3 sm:p-4 text-left transition-all overflow-hidden text-sm sm:text-base",
                      hasVoted
                        ? "cursor-default"
                        : "cursor-pointer hover:border-primary hover:shadow-md",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    {/* Progress bar background */}
                    {hasVoted && (
                      <div
                        className={cn(
                          "absolute inset-0 transition-all duration-500",
                          isSelected ? "bg-primary/10" : "bg-muted/30"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    )}

                    {/* Content */}
                    <div className="relative flex items-center justify-between">
                      <span className="font-medium">{option.label}</span>
                      {hasVoted && (
                        <span className="text-sm font-bold ml-2">
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Stats */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {getTotalVotes()} {t("pollCard.votes")}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 sm:gap-2 h-8 sm:h-9"
                >
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{poll.comments.length}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 sm:h-9">
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              {t("pollDetail.comments")} ({poll.comments.length})
            </h2>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {/* Add Comment Form - Only for authenticated users */}
            {poll.allow_comments && (
              <div className="space-y-2">
                {user ? (
                  <div className="flex gap-2">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t("pollDetail.addComment")}
                      className="min-h-[80px]"
                      maxLength={1000}
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!commentText.trim() || submittingComment}
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground text-sm mb-2">
                      {t("pollDetail.signInToComment")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/auth")}
                    >
                      {t("header.signIn")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!poll.allow_comments && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t("pollDetail.commentsDisabled")}
              </div>
            )}

            {/* Comments List */}
            {poll.comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("pollDetail.noComments")}
              </div>
            ) : (
              <div className="space-y-4">
                {poll.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.author?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {comment.author?.username?.charAt(0).toUpperCase() || "G"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {comment.author?.username || t("pollDetail.guest")}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm mt-1 break-words">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

