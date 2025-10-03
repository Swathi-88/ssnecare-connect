import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import { toast } from "sonner";

const Marketplace = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchItems();
    }
  }, [session]);

  useEffect(() => {
    filterItems();
  }, [items, category, searchQuery]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session?.user.id)
      .single();
    setProfile(data);
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select(`
        *,
        profiles:seller_id (
          full_name,
          avatar_url
        )
      `)
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load items");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const filterItems = () => {
    let filtered = items;

    if (category !== "all") {
      filtered = filtered.filter((item) => item.category === category);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
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

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header user={session.user} profile={profile} />

      <main className="container py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="sell">For Sale</TabsTrigger>
            <TabsTrigger value="rent">For Rent</TabsTrigger>
            <TabsTrigger value="buy">Looking For</TabsTrigger>
          </TabsList>

          <TabsContent value={category} className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Package className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">No items found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Be the first to list an item!"}
                  </p>
                </div>
                <Button onClick={() => navigate("/list-item")} className="bg-gradient-to-r from-primary to-secondary">
                  List an Item
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                      {item.image_urls?.[0] ? (
                        <img
                          src={item.image_urls[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                      <Badge
                        className={`absolute top-2 right-2 ${getCategoryColor(item.category)}`}
                      >
                        {item.category === "buy" ? "Looking For" : `For ${item.category}`}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold text-primary">₹{item.price}</p>
                        {item.condition && (
                          <Badge variant="outline">{item.condition}</Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="text-sm text-muted-foreground">
                      by {item.profiles?.full_name || "Anonymous"}
                    </CardFooter>
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

export default Marketplace;