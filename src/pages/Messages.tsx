import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";

const Messages = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
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
      fetchConversations();
    }
  }, [session]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session?.user.id)
      .single();
    setProfile(data);
  };

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select(`
        id,
        created_at,
        items (
          title,
          image_urls,
          price
        ),
        buyer:buyer_id (
          id,
          full_name,
          avatar_url
        ),
        seller:seller_id (
          id,
          full_name,
          avatar_url
        ),
        messages (
          content,
          created_at
        )
      `)
      .or(`buyer_id.eq.${session?.user.id},seller_id.eq.${session?.user.id}`)
      .order("created_at", { ascending: false });

    setConversations(data || []);
  };

  if (!session || !profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header user={session.user} profile={profile} />

      <main className="container py-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start a conversation by contacting a seller
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv) => {
              const otherUser =
                conv.buyer_id === session.user.id ? conv.seller : conv.buyer;
              const lastMessage = conv.messages?.[0];

              return (
                <Card
                  key={conv.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => navigate(`/chat/${conv.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherUser?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {otherUser?.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold">{otherUser?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lastMessage &&
                              new Date(lastMessage.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {conv.items?.title} - ₹{conv.items?.price}
                        </p>
                        {lastMessage && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;