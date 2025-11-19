import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingBag, LogOut, User, PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface HeaderProps {
  user: any;
  profile: any;
}

const Header = ({ user, profile }: HeaderProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b glass shadow-elegant">
      <div className="container flex h-20 items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center space-x-3 hover:opacity-80 transition-smooth group"
        >
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-glow relative">
            <ShoppingBag className="w-6 h-6 text-white" />
            <div className="absolute inset-0 gradient-primary rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-bold text-2xl hidden sm:inline gradient-primary bg-clip-text text-transparent">Dripster</span>
        </button>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/search")}
            className="hover:bg-primary/10 transition-smooth h-11 w-11"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            onClick={() => navigate("/list-item")}
            className="gradient-primary shadow-glow hover:shadow-xl transition-smooth hidden sm:flex h-11"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            List Item
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-11 w-11 rounded-full transition-smooth hover:ring-2 hover:ring-primary/20">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="gradient-primary text-white font-semibold">
                    {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 shadow-elegant-lg border-2" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/list-item")} className="sm:hidden">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>List Item</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;