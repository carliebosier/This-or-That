import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PollCard } from "@/components/PollCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LogIn, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";

interface Poll {
  id: string;
  title: string;
  is_anonymous: boolean;
  created_at: string;
  author: {
    id: string;
    username: string;
  } | null;
  poll_options: Array<{
    id: string;
    label: string;
  }>;
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
  comments: Array<{ id: string }>;
  media_assets: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"new" | "top">("new");

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
    loadPolls();
  }, [sortBy]);

  const loadPolls = async () => {
    setLoading(true);
    
    let query = supabase
      .from("polls")
      .select(`
        *,
        author:profiles!author_id(username, id),
        poll_options(*),
        poll_tags(tags(label)),
        votes(option_id, voter_user_id, voter_guest_id),
        comments(id),
        media_assets(id, type, url)
      `)
      .eq("is_public", true);

    if (sortBy === "new") {
      query = query.order("created_at", { ascending: false });
    } else {
      // For "top", we'll sort by vote count client-side
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error("Error loading polls:", error);
      toast({
        title: t("home.error"),
        description: t("home.failedToLoad"),
        variant: "destructive",
      });
    } else {
      let sortedData = data || [];
      if (sortBy === "top") {
        sortedData = sortedData.sort((a, b) => b.votes.length - a.votes.length);
      }
      setPolls(sortedData);
    }

    setLoading(false);
  };

  const handleVote = async (pollId: string, optionId: string) => {
    // Require authentication to vote
    if (!user) {
      toast({
        title: t("home.signInRequired"),
        description: t("home.signInToVote"),
      });
      navigate("/auth");
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({
          title: t("home.signInRequired"),
          description: t("home.signInToVote"),
        });
        navigate("/auth");
        return;
      }

      // Check if user already voted
      const { data: existingVoteData } = await supabase
        .from("votes")
        .select("id, option_id")
        .eq("poll_id", pollId)
        .eq("voter_user_id", authUser.id)
        .maybeSingle();

      if (existingVoteData) {
        // Already voted, don't allow change from the card view
        return;
      }

      // Create new vote - explicitly set voter_guest_id to NULL to avoid constraint conflicts
      const { error } = await supabase.from("votes").insert({
        poll_id: pollId,
        option_id: optionId,
        voter_user_id: authUser.id,
        voter_guest_id: null,
      });

      if (error) {
        console.error("Error inserting vote:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Poll ID:", pollId, "Option ID:", optionId, "User ID:", authUser.id);
        toast({
          title: t("home.error"),
          description: error.message || t("home.failedToVote"),
          variant: "destructive",
        });
        return;
      }

      // Reload polls to show updated results
      loadPolls();
      toast({
        title: t("home.voteCast"),
        description: t("home.voteRecorded"),
      });
    } catch (error: any) {
      console.error("Error voting:", error);
      toast({
        title: t("home.error"),
        description: error.message || t("home.failedToVote"),
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: t("home.signedOut"),
      description: t("home.signedOutSuccess"),
    });
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">
            {t("app.title")}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/profile/${user.id}`)}
                >
                  <User className="h-4 w-4 mr-2" />
                  {t("header.profile")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  {t("header.signOut")}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {t("header.signIn")}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "new" | "top")}>
          <TabsList className="w-full">
            <TabsTrigger value="new" className="flex-1">
              {t("home.new")}
            </TabsTrigger>
            <TabsTrigger value="top" className="flex-1">
              {t("home.top")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={sortBy} className="mt-6 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : polls.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t("home.noPolls")}</p>
              </div>
            ) : (
              polls.map((poll) => {
                const userVote = poll.votes.find(
                  (v) => v.voter_user_id === user?.id
                );

                const optionsWithVotes = poll.poll_options.map((opt) => ({
                  id: opt.id,
                  label: opt.label,
                  votes: poll.votes.filter((v) => v.option_id === opt.id).length,
                }));

                return (
                  <PollCard
                    key={poll.id}
                    id={poll.id}
                    title={poll.title}
                    author={poll.author?.username || "Anonymous"}
                    authorId={poll.is_anonymous ? undefined : poll.author?.id}
                    timeAgo={formatDistanceToNow(new Date(poll.created_at), {
                      addSuffix: true,
                    })}
                    options={optionsWithVotes}
                    totalVotes={poll.votes.length}
                    commentCount={poll.comments.length}
                    tags={poll.poll_tags.map((pt) => pt.tags.label)}
                    userVote={userVote?.option_id}
                    isAnonymous={poll.is_anonymous}
                    mediaAssets={poll.media_assets || []}
                    onVote={handleVote}
                    onClick={() => navigate(`/polls/${poll.id}`)}
                  />
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-colored"
        onClick={() => {
          if (!user) {
            toast({
              title: t("home.signInRequired"),
              description: t("home.signInToCreate"),
            });
            navigate("/auth");
          } else {
            navigate("/polls/new");
          }
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
