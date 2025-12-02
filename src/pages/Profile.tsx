import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PollCard } from "@/components/PollCard";
import { ArrowLeft, Users, BarChart3, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface Poll {
  id: string;
  title: string;
  created_at: string;
  is_anonymous: boolean;
  author?: {
    id: string;
    username: string;
  };
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
  }>;
  comments: Array<{ id: string }>;
  media_assets?: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Poll[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProfileData();
    }
  }, [userId, currentUser]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user's polls
      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select(`
          id,
          title,
          created_at,
          is_anonymous,
          poll_options (id, label),
          poll_tags (tags (label)),
          votes (option_id),
          comments (id),
          media_assets (id, type, url)
        `)
        .eq("author_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (pollsError) throw pollsError;
      setPolls(pollsData || []);

      // Fetch polls user has voted on (only if authenticated)
      if (currentUser && currentUser.id === userId) {
        const { data: votesData, error: votesError } = await supabase
          .from("votes")
          .select(`
            poll_id,
            polls (
              id,
              title,
              created_at,
              is_anonymous,
              author_id,
              author:profiles!author_id(id, username),
              poll_options (id, label),
              poll_tags (tags (label)),
              votes (option_id),
              comments (id),
              media_assets (id, type, url)
            )
          `)
          .eq("voter_user_id", userId);

        if (!votesError && votesData) {
          const uniquePolls = Array.from(
            new Map(
              votesData
                .filter(v => v.polls)
                .map(v => [v.polls.id, v.polls])
            ).values()
          );
          setVotedPolls(uniquePolls as any);
        }
      }

      // Fetch follower count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      setFollowerCount(followersCount || 0);

      // Fetch following count
      const { count: followingCountData } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      setFollowingCount(followingCountData || 0);

      // Check if current user follows this profile
      if (currentUser && currentUser.id !== userId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)
          .single();

        setIsFollowing(!!followData);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("profile.error"),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      navigate("/auth");
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId);
        
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
        toast({
          title: t("profile.unfollowed"),
        });
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: userId,
          });
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast({
          title: t("profile.followed"),
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("profile.followError"),
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">{t("profile.notFound")}</div>
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with back button */}
        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-muted-foreground mb-4">@{profile.username}</p>
                
                {profile.bio && (
                  <p className="text-foreground mb-4">{profile.bio}</p>
                )}

                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{followerCount}</span>
                    <span className="text-muted-foreground">{t("profile.followers")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{followingCount}</span>
                    <span className="text-muted-foreground">{t("profile.following")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {t("profile.joined")} {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {!isOwnProfile && currentUser && (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                  >
                    {isFollowing ? t("profile.unfollow") : t("profile.follow")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("profile.pollsCreated")}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{polls.length}</div>
            </CardContent>
          </Card>

          {isOwnProfile && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("profile.pollsVoted")}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{votedPolls.length}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs for Polls and Voting History */}
        <Tabs defaultValue="polls" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="polls">{t("profile.polls")}</TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="voted">{t("profile.votingHistory")}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="polls" className="space-y-4 mt-6">
            {polls.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  {t("profile.noPolls")}
                </CardContent>
              </Card>
            ) : (
              polls.map((poll) => {
                const userVote = poll.votes.find(
                  (v: any) => v.voter_user_id === currentUser?.id
                );

                const optionsWithVotes = poll.poll_options.map((opt) => ({
                  id: opt.id,
                  label: opt.label,
                  votes: poll.votes.filter((v: any) => v.option_id === opt.id).length,
                }));

                  return (
                    <PollCard
                      key={poll.id}
                      id={poll.id}
                      title={poll.title}
                      author={profile.username}
                      authorId={poll.is_anonymous ? undefined : profile.id}
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
                      onVote={async () => {
                        await fetchProfileData();
                      }}
                      onClick={() => navigate(`/polls/${poll.id}`)}
                    />
                  );
              })
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="voted" className="space-y-4 mt-6">
              {votedPolls.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    {t("profile.noVotes")}
                  </CardContent>
                </Card>
              ) : (
                votedPolls.map((poll) => {
                  const userVote = poll.votes.find(
                    (v: any) => v.voter_user_id === currentUser?.id
                  );

                  const optionsWithVotes = poll.poll_options.map((opt) => ({
                    id: opt.id,
                    label: opt.label,
                    votes: poll.votes.filter((v: any) => v.option_id === opt.id).length,
                  }));

                  return (
                    <PollCard
                      key={poll.id}
                      id={poll.id}
                      title={poll.title}
                      author={poll.author?.username || "Unknown"}
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
                      onVote={async () => {
                        await fetchProfileData();
                      }}
                      onClick={() => navigate(`/polls/${poll.id}`)}
                    />
                  );
                })
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
