import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfluencerProfile, User } from "@shared/schema";
import { Star } from "lucide-react";

interface InfluencerCardProps {
  influencer: InfluencerProfile;
  userData: User;
}

const InfluencerCard = ({ influencer, userData }: InfluencerCardProps) => {
  return (
    <Link href={`/influencer/${influencer.userId}`}>
      <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-100 cursor-pointer">
        <div className="relative">
          <img 
            src={userData.profileImage || "https://via.placeholder.com/500x500?text=No+Image"} 
            alt={userData.fullName || userData.username} 
            className="w-full h-60 object-cover"
          />
          <div className={`absolute top-3 right-3 ${influencer.isOnline ? 'bg-green-500' : 'bg-red-500'} text-white px-2 py-1 rounded-full text-xs font-medium flex items-center`}>
            <span className="w-2 h-2 bg-white rounded-full inline-block mr-1"></span>
            {influencer.isOnline ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg">{userData.fullName || userData.username}</h3>
          <p className="text-gray-500 text-sm mb-2">{influencer.category}</p>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="flex items-center text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="ml-1">{influencer.ratingAvg.toFixed(1)}</span>
              </span>
              <span className="text-xs text-gray-500">({influencer.ratingCount} reviews)</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Starting at</div>
              <div className="font-bold text-primary">₹{influencer.pricePerMinute}/min</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default InfluencerCard;
