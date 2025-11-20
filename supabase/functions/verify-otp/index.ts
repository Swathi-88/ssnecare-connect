import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: VerifyOTPRequest = await req.json();

    console.log("Verifying OTP for email:", email);

    // Hash the submitted OTP for comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find the OTP record
    const now = new Date().toISOString();
    const queryParams = new URLSearchParams({
      email: `eq.${email}`,
      verified: `eq.false`,
      expires_at: `gt.${now}`,
    });

    const fetchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/email_verifications?${queryParams}`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Accept": "application/json",
        },
      }
    );

    if (!fetchResponse.ok) {
      console.error("Database fetch error:", await fetchResponse.text());
      throw new Error("Failed to verify OTP");
    }

    const verifications = await fetchResponse.json();

    if (!verifications || verifications.length === 0) {
      console.log("Invalid or expired OTP");
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP code" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const verification = verifications[0];

    // Rate limiting: Check if too many attempts
    if (verification.attempts >= 5) {
      console.log("Too many OTP attempts for:", email);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please request a new code." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify the hashed OTP matches
    if (verification.otp_hash !== otpHash) {
      // Increment attempt counter
      await fetch(
        `${SUPABASE_URL}/rest/v1/email_verifications?id=eq.${verification.id}`,
        {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ 
            attempts: verification.attempts + 1,
            last_attempt_at: new Date().toISOString()
          }),
        }
      );

      console.log("Invalid OTP provided");
      return new Response(
        JSON.stringify({ error: "Invalid OTP code" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark as verified
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/email_verifications?id=eq.${verification.id}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ verified: true }),
      }
    );

    if (!updateResponse.ok) {
      console.error("Failed to update verification status:", await updateResponse.text());
      throw new Error("Failed to verify OTP");
    }

    console.log("OTP verified successfully for:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to verify OTP" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
