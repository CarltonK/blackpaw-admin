
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Building, Calendar, Edit } from "lucide-react";
import { useState } from "react";

interface Profile {
  name: string;
  email: string;
  phone: string;
  business: string;
  joinDate: string;
}

interface ProfileCardProps {
  profile: Profile;
}

export const ProfileCard = ({ profile }: ProfileCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);

  const handleSave = () => {
    // In a real app, this would save to your backend
    console.log("Saving profile:", editedProfile);
    setIsEditing(false);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Manage your account details</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit className="h-4 w-4 mr-2" />
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </Label>
            {isEditing ? (
              <Input
                id="name"
                value={editedProfile.name}
                onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
              />
            ) : (
              <p className="text-sm font-medium">{profile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            {isEditing ? (
              <Input
                id="email"
                type="email"
                value={editedProfile.email}
                onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
              />
            ) : (
              <p className="text-sm font-medium">{profile.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            {isEditing ? (
              <Input
                id="phone"
                value={editedProfile.phone}
                onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
              />
            ) : (
              <p className="text-sm font-medium">{profile.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Business Name
            </Label>
            {isEditing ? (
              <Input
                id="business"
                value={editedProfile.business}
                onChange={(e) => setEditedProfile({...editedProfile, business: e.target.value})}
              />
            ) : (
              <p className="text-sm font-medium">{profile.business}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Member Since
            </Label>
            <p className="text-sm font-medium">{profile.joinDate}</p>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave}>Save Changes</Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
