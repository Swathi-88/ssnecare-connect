import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Loader2, Package } from "lucide-react";

const Profile = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchMyItems();
      fetchTransactions();
    }
  }, [session]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session?.user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
      });
    }
  };

  const fetchMyItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("seller_id", session?.user.id)
      .order("created_at", { ascending: false });
    
    setMyItems(data || []);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select(`
        *,
        items (title),
        buyer:buyer_id (full_name),
        seller:seller_id (full_name)
      `)
      .or(`buyer_id.eq.${session?.user.id},seller_id.eq.${session?.user.id}`)
      .order("created_at", { ascending: false });
    
    setTransactions(data || []);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq("id", session?.user.id);

      if (error) throw error;

      toast.success("Profile updated!");
      setEditMode(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "sell":
        return "bg-primary/10 text-primary border-primary";
      case "rent":
        return "bg-secondary/10 text-secondary border-secondary";
      case "buy":
        return "bg-accent/10 text-accent border-accent";
      default:
        return "";
    }
  };

  if (!session || !profile) return null;

  return (
    <div className="min-h-screen gradient-mesh">
      <Header user={session.user} profile={profile} />

      <main className="container py-8 max-w-5xl animate-fade-in">
        <Card className="mb-8 shadow-elegant-lg border-2 glass">
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-glow">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="gradient-primary text-white text-3xl">
                    {profile.full_name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg gradient-primary text-white hover:scale-110 transition-smooth border-2"
                >
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1">
                <CardTitle className="text-3xl text-primary">{profile.full_name || "Anonymous"}</CardTitle>
                <CardDescription className="text-base">{session.user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateProfile} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {profile.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p>{profile.phone}</p>
                  </div>
                )}
                <Button onClick={() => setEditMode(true)}>Edit Profile</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-card shadow-elegant">
            <TabsTrigger value="items" className="transition-smooth data-[state=active]:shadow-md data-[state=active]:gradient-primary data-[state=active]:text-white text-base">My Listings</TabsTrigger>
            <TabsTrigger value="history" className="transition-smooth data-[state=active]:shadow-md data-[state=active]:gradient-primary data-[state=active]:text-white text-base">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-6">
            {myItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items listed yet</p>
                  <Button
                    onClick={() => navigate("/list-item")}
                    className="mt-4 bg-gradient-to-r from-primary to-secondary"
                  >
                    List an Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myItems.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                      {item.image_urls?.[0] ? (
                        <img
                          src={item.image_urls[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <Badge className={`absolute top-2 right-2 ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </Badge>
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                      <p className="text-lg font-bold text-primary">₹{item.price}</p>
                      <Badge variant="outline" className="mt-2">
                        {item.is_available ? "Available" : "Sold"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {transactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No transactions yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <Card key={transaction.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{transaction.items?.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.buyer_id === session.user.id ? "Bought from" : "Sold to"}{" "}
                            {transaction.buyer_id === session.user.id
                              ? transaction.seller?.full_name
                              : transaction.buyer?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">₹{transaction.amount}</p>
                          <Badge variant="outline" className="mt-1">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;