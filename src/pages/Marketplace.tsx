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
    <div className="min-h-screen gradient-mesh">
      <Header user={session.user} profile={profile} />

      <main className="container py-8 space-y-8 animate-fade-in">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          <Input
            placeholder="Search for items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-base shadow-elegant transition-smooth hover:shadow-elegant-lg focus:shadow-glow border-2"
          />
        </div>

         {/* Category Tabs */}
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="grid w-full grid-cols-4 h-14 p-1 bg-card shadow-elegant">
            <TabsTrigger value="all" className="transition-smooth data-[state=active]:shadow-md data-[state=active]:gradient-primary data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="sell" className="transition-smooth data-[state=active]:shadow-md data-[state=active]:gradient-primary data-[state=active]:text-white">For Sale</TabsTrigger>
            <TabsTrigger value="rent" className="transition-smooth data-[state=active]:shadow-md data-[state=active]:gradient-primary data-[state=active]:text-white">For Rent</TabsTrigger>
            <TabsTrigger value="buy" className="transition-smooth data-[state=active]:shadow-md data-[state=active]:gradient-primary data-[state=active]:text-white">Looking For</TabsTrigger>
          </TabsList>

          <TabsContent value={category} className="mt-8">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-glow"></div>
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="py-20 text-center shadow-elegant-lg glass border-2">
                <div className="relative inline-block">
                  <Package className="h-20 w-20 text-primary mx-auto mb-6 animate-float" />
                  <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-2xl">No items found</h3>
                  <p className="text-muted-foreground text-lg">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Be the first to list an item!"}
                  </p>
                </div>
                <Button onClick={() => navigate("/list-item")} className="mt-8 h-12 px-8 gradient-primary shadow-glow hover:shadow-xl transition-smooth text-base">
                  List an Item
                </Button>
              </Card>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item, index) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden shadow-elegant hover:shadow-glow transition-smooth cursor-pointer group animate-fade-in border-2"
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-muted via-muted/80 to-muted/50 relative overflow-hidden">
                      {item.image_urls?.[0] ? (
                        <>
                          <img
                            src={item.image_urls[0]}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center relative">
                          <div className="absolute inset-0 gradient-mesh opacity-30" />
                          <Package className="h-20 w-20 text-muted-foreground/40 relative z-10" />
                        </div>
                      )}
                      <Badge
                        className={`absolute top-3 right-3 ${getCategoryColor(item.category)} shadow-lg backdrop-blur-sm transition-smooth`}
                      >
                        {item.category === "buy" ? "Looking For" : `For ${item.category}`}
                      </Badge>
                    </div>
                    <CardHeader className="space-y-3">
                      <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors text-xl">{item.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-base">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent">₹{item.price}</p>
                        {item.condition && (
                          <Badge variant="outline" className="transition-smooth hover:bg-primary/10">{item.condition}</Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="text-sm text-muted-foreground border-t pt-4">
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