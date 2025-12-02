import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface MediaAsset {
  id: string;
  type: string;
  url: string;
}

interface PollCardProps {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  timeAgo: string;
  options: PollOption[];
  totalVotes: number;
  commentCount: number;
  tags: string[];
  userVote?: string;
  isAnonymous?: boolean;
  mediaAssets?: MediaAsset[];
  onVote: (pollId: string, optionId: string) => void;
  onClick: () => void;
}

export const PollCard = ({
  id,
  title,
  author,
  authorId,
  timeAgo,
  options,
  totalVotes,
  commentCount,
  tags,
  userVote,
  isAnonymous,
  mediaAssets = [],
  onVote,
  onClick,
}: PollCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | undefined>(userVote);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleVote = (optionId: string) => {
    setSelectedOption(optionId);
    onVote(id, optionId);
  };

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <Card className="overflow-hidden transition-smooth hover:shadow-lg">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span 
                className={cn(
                  "font-medium text-foreground",
                  !isAnonymous && authorId && "cursor-pointer hover:underline"
                )}
                onClick={(e) => {
                  if (!isAnonymous && authorId) {
                    e.stopPropagation();
                    navigate(`/profile/${authorId}`);
                  }
                }}
              >
                {isAnonymous ? t("pollCard.anonymous") : author}
              </span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
            <h3
              className="text-lg font-bold cursor-pointer hover:text-primary transition-smooth"
              onClick={onClick}
            >
              {title}
            </h3>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Media Assets */}
        {mediaAssets.length > 0 && (
          <div className={cn(
            "grid gap-2",
            mediaAssets.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {mediaAssets.map((media) => (
              <div key={media.id} className="rounded-lg overflow-hidden border border-border">
                {media.type === "image" ? (
                  <img 
                    src={media.url} 
                    alt="Poll media" 
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-smooth"
                    onClick={onClick}
                  />
                ) : (
                  <video 
                    src={media.url} 
                    className="w-full h-48 object-cover"
                    controls
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Poll Options */}
        <div className="space-y-2">
          {options.map((option) => {
            const percentage = getPercentage(option.votes);
            const isSelected = selectedOption === option.id;
            const hasVoted = !!selectedOption;

            return (
              <button
                key={option.id}
                onClick={() => !hasVoted && handleVote(option.id)}
                disabled={hasVoted}
                className={cn(
                  "relative w-full rounded-lg border-2 p-4 text-left transition-smooth overflow-hidden",
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {totalVotes} {t("pollCard.votes")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={onClick}
            >
              <MessageCircle className="h-4 w-4" />
              {commentCount}
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
