import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, MessageCircle, Package, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const ItemDetail = () => {
  const { id } = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      fetchItem();
    }
  }, [session, id]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session?.user.id)
      .single();
    setProfile(data);
  };

  const fetchItem = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select(`
        *,
        profiles:seller_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Item not found");
      navigate("/");
    } else {
      setItem(data);
    }
    setLoading(false);
  };

  const handleContact = async () => {
    if (!item) return;

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("item_id", item.id)
      .eq("buyer_id", session?.user.id)
      .eq("seller_id", item.seller_id)
      .maybeSingle();

    if (existingConv) {
      navigate(`/chat/${existingConv.id}`);
      return;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        item_id: item.id,
        buyer_id: session?.user.id,
        seller_id: item.seller_id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to start conversation");
    } else {
      navigate(`/chat/${data.id}`);
    }
  };

  const handleDeleteItem = async () => {
    if (!item) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted successfully");
      navigate("/profile");
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

  if (!session || !profile || loading) return null;

  if (!item) return null;

  const isOwner = item.seller_id === session.user.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header user={session.user} profile={profile} />

      <main className="container py-6 max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Images */}
          <div>
            <Card className="overflow-hidden">
              {item.image_urls && item.image_urls.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {item.image_urls.map((url: string, index: number) => (
                      <CarouselItem key={index}>
                        <div className="aspect-square">
                          <img
                            src={url}
                            alt={`${item.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {item.image_urls.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </Card>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <Badge className={`mb-2 ${getCategoryColor(item.category)}`}>
                {item.category === "buy" ? "Looking For" : `For ${item.category}`}
              </Badge>
              <h1 className="text-3xl font-bold mb-2">{item.title}</h1>
              <div className="mb-4">
                <p className="text-4xl font-bold text-primary">₹{item.price}</p>
                {item.category !== "buy" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Seller receives: ₹{(item.price * 0.9).toFixed(2)} (after 10% platform fee)
                  </p>
                )}
              </div>

              {item.condition && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Condition:</span>
                  <Badge variant="outline">{item.condition}</Badge>
                </div>
              )}

              {item.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{item.location}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
              </div>
            )}

            {/* Seller Info */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Seller Information</h3>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={item.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                      {item.profiles?.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{item.profiles?.full_name || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">{item.profiles?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {!isOwner ? (
              <Button
                onClick={handleContact}
                className="w-full bg-gradient-to-r from-primary to-secondary"
                size="lg"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Contact Seller
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" size="lg">
                    <Trash2 className="mr-2 h-5 w-5" />
                    Delete Item
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your item listing.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetail;