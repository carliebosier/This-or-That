-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create guest identities table
CREATE TABLE public.guest_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create polls table
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_guest_id UUID REFERENCES public.guest_identities(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  body TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create poll options table
CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) <= 60),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  voter_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  voter_guest_id UUID REFERENCES public.guest_identities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_vote UNIQUE NULLS NOT DISTINCT (poll_id, voter_user_id),
  CONSTRAINT unique_guest_vote UNIQUE NULLS NOT DISTINCT (poll_id, voter_guest_id),
  CONSTRAINT vote_has_voter CHECK (
    (voter_user_id IS NOT NULL AND voter_guest_id IS NULL) OR
    (voter_user_id IS NULL AND voter_guest_id IS NOT NULL)
  )
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_guest_id UUID REFERENCES public.guest_identities(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_has_author CHECK (
    (author_user_id IS NOT NULL AND author_guest_id IS NULL) OR
    (author_user_id IS NULL AND author_guest_id IS NOT NULL)
  )
);

-- Create media assets table
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create poll tags junction table
CREATE TABLE public.poll_tags (
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, tag_id)
);

-- Create follows table for social features
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for guest_identities
CREATE POLICY "Guest identities viewable by creator" ON public.guest_identities FOR SELECT USING (true);
CREATE POLICY "Anyone can create guest identity" ON public.guest_identities FOR INSERT WITH CHECK (true);

-- RLS Policies for tags
CREATE POLICY "Tags viewable by everyone" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for polls
CREATE POLICY "Public polls viewable by everyone" ON public.polls FOR SELECT USING (is_public = true);
CREATE POLICY "Authenticated users can create polls" ON public.polls FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Poll authors can update own polls" ON public.polls FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Poll authors can delete own polls" ON public.polls FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for poll_options
CREATE POLICY "Poll options viewable with poll" ON public.poll_options FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.polls WHERE polls.id = poll_id AND polls.is_public = true)
);
CREATE POLICY "Poll authors can manage options" ON public.poll_options FOR ALL USING (
  EXISTS (SELECT 1 FROM public.polls WHERE polls.id = poll_id AND polls.author_id = auth.uid())
);

-- RLS Policies for votes
CREATE POLICY "Votes viewable by everyone" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Users can insert own votes" ON public.votes FOR INSERT WITH CHECK (
  voter_user_id = auth.uid() OR voter_guest_id IS NOT NULL
);
CREATE POLICY "Users can update own votes" ON public.votes FOR UPDATE USING (
  voter_user_id = auth.uid() OR voter_guest_id IS NOT NULL
);
CREATE POLICY "Users can delete own votes" ON public.votes FOR DELETE USING (
  voter_user_id = auth.uid() OR voter_guest_id IS NOT NULL
);

-- RLS Policies for comments
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (
  author_user_id = auth.uid() OR author_guest_id IS NOT NULL
);
CREATE POLICY "Comment authors can delete own comments" ON public.comments FOR DELETE USING (
  author_user_id = auth.uid() OR author_guest_id IS NOT NULL
);

-- RLS Policies for media_assets
CREATE POLICY "Media viewable with poll" ON public.media_assets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.polls WHERE polls.id = poll_id AND polls.is_public = true)
);
CREATE POLICY "Poll authors can manage media" ON public.media_assets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.polls WHERE polls.id = poll_id AND polls.author_id = auth.uid())
);

-- RLS Policies for poll_tags
CREATE POLICY "Poll tags viewable by everyone" ON public.poll_tags FOR SELECT USING (true);
CREATE POLICY "Poll authors can manage tags" ON public.poll_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.polls WHERE polls.id = poll_id AND polls.author_id = auth.uid())
);

-- RLS Policies for follows
CREATE POLICY "Follows viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX idx_polls_author ON public.polls(author_id);
CREATE INDEX idx_votes_poll ON public.votes(poll_id);
CREATE INDEX idx_votes_option ON public.votes(option_id);
CREATE INDEX idx_comments_poll ON public.comments(poll_id);
CREATE INDEX idx_poll_tags_poll ON public.poll_tags(poll_id);
CREATE INDEX idx_poll_tags_tag ON public.poll_tags(tag_id);

-- Insert starter tags
INSERT INTO public.tags (slug, label) VALUES
  ('tech', 'Tech'),
  ('fashion', 'Fashion'),
  ('food', 'Food'),
  ('college', 'College'),
  ('music', 'Music'),
  ('sports', 'Sports'),
  ('gaming', 'Gaming'),
  ('movies', 'Movies');

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('poll-media', 'poll-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for poll media
CREATE POLICY "Poll media publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'poll-media');

CREATE POLICY "Authenticated users can upload poll media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'poll-media' AND
  auth.uid() IS NOT NULL
);