import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createTransport } from "npm:nodemailer";

// CORS headers for function invocation
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Create reusable transporter
function createMailTransport(): ReturnType<typeof createTransport> {
  const host = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const port = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const secure = Deno.env.get("SMTP_SECURE") === "true";
  const user = Deno.env.get("SMTP_USER") || "";
  const pass = Deno.env.get("SMTP_PASS") || "";

  console.log("[SMTP] Creating transport with config:", {
    host,
    port,
    secure,
    user: user ? `${user.substring(0, 3)}***` : "NOT SET",
    pass: pass ? "***SET***" : "NOT SET",
  });

  const config: EmailConfig = {
    host,
    port,
    secure,
    auth: { user, pass },
  };

  return createTransport(config);
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] ===== SEND-EMAIL EDGE FUNCTION INVOKED =====`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  
  // Log headers (excluding sensitive auth token)
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization') {
      headers[key] = value.substring(0, 20) + '...';
    } else {
      headers[key] = value;
    }
  });
  console.log(`[${requestId}] Headers:`, JSON.stringify(headers));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Responding to CORS preflight`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log(`[${requestId}] Environment check:`);
    console.log(`[${requestId}]   SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET'}`);
    console.log(`[${requestId}]   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? 'SET (length: ' + serviceRoleKey.length + ')' : 'NOT SET'}`);
    console.log(`[${requestId}]   SMTP_HOST: ${Deno.env.get("SMTP_HOST") || 'NOT SET (using default)'}`);
    console.log(`[${requestId}]   SMTP_USER: ${Deno.env.get("SMTP_USER") ? 'SET' : 'NOT SET'}`);
    console.log(`[${requestId}]   SMTP_PASS: ${Deno.env.get("SMTP_PASS") ? 'SET' : 'NOT SET'}`);
    console.log(`[${requestId}]   SMTP_FROM: ${Deno.env.get("SMTP_FROM") || 'NOT SET (using default)'}`);

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[${requestId}] Missing required environment variables!`);
      return new Response(
        JSON.stringify({ 
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
          supabaseUrl: !!supabaseUrl,
          serviceRoleKey: !!serviceRoleKey
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    console.log(`[${requestId}] Creating Supabase client...`);
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log(`[${requestId}] Supabase client created successfully`);

    // Get batch size from request or default
    let body = {};
    try {
      body = await req.json();
      console.log(`[${requestId}] Request body:`, JSON.stringify(body));
    } catch {
      console.log(`[${requestId}] No JSON body or invalid JSON`);
    }
    const batchSize = (body as { batchSize?: number }).batchSize || 50;
    console.log(`[${requestId}] Batch size: ${batchSize}`);

    // Fetch pending email notifications
    console.log(`[${requestId}] Fetching pending email notifications...`);
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications")
      .select(`
        *,
        user:profiles(id, email, full_name)
      `)
      .eq("status", "pending")
      .eq("channel", "email")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error(`[${requestId}] Database fetch error:`, fetchError);
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    console.log(`[${requestId}] Found ${notifications?.length || 0} pending notifications`);

    if (!notifications || notifications.length === 0) {
      console.log(`[${requestId}] No pending notifications to process`);
      return new Response(
        JSON.stringify({ message: "No pending notifications", processed: 0, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log notification details
    notifications.forEach((n, i) => {
      console.log(`[${requestId}] Notification ${i + 1}:`, {
        id: n.id,
        title: n.title?.substring(0, 50),
        userEmail: n.user?.email || 'NO EMAIL',
        userName: n.user?.full_name || 'NO NAME',
      });
    });

    // Create mail transporter
    console.log(`[${requestId}] Creating mail transporter...`);
    const transporter = createMailTransport();
    const fromAddress = Deno.env.get("SMTP_FROM") || "noreply@ecosystem.local";
    console.log(`[${requestId}] From address: ${fromAddress}`);

    let sent = 0;
    let failed = 0;
    const results: { id: string; status: string; error?: string }[] = [];

    // Process each notification
    for (const notification of notifications) {
      console.log(`[${requestId}] Processing notification ${notification.id}...`);
      
      if (!notification.user?.email) {
        console.log(`[${requestId}] No email for notification ${notification.id}, marking as failed`);
        // Mark as failed if no email
        await supabase
          .from("notifications")
          .update({
            status: "failed",
            metadata: {
              ...(notification.metadata || {}),
              error: "No email address found for user",
            },
          })
          .eq("id", notification.id);

        failed++;
        results.push({ id: notification.id, status: "failed", error: "No email address" });
        continue;
      }

      try {
        console.log(`[${requestId}] Sending email to ${notification.user.email}...`);
        // Send email
        const mailResult = await transporter.sendMail({
          from: fromAddress,
          to: notification.user.email,
          subject: notification.title,
          html: notification.message.replace(/\n/g, "<br>"),
          text: notification.message,
        });
        console.log(`[${requestId}] Email sent successfully:`, mailResult.messageId);

        // Mark as sent
        await supabase
          .from("notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        sent++;
        results.push({ id: notification.id, status: "sent" });
      } catch (emailError) {
        const errorMsg = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`[${requestId}] Failed to send email for ${notification.id}:`, errorMsg);
        
        // Mark as failed
        await supabase
          .from("notifications")
          .update({
            status: "failed",
            metadata: {
              ...(notification.metadata || {}),
              error: errorMsg,
            },
          })
          .eq("id", notification.id);

        failed++;
        results.push({
          id: notification.id,
          status: "failed",
          error: errorMsg,
        });
      }
    }

    // Close transporter
    console.log(`[${requestId}] Closing transporter...`);
    transporter.close();

    const response = {
      message: "Email processing complete",
      processed: notifications.length,
      sent,
      failed,
      results,
    };
    console.log(`[${requestId}] Final result:`, JSON.stringify(response));

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[${requestId}] ===== EDGE FUNCTION ERROR =====`);
    console.error(`[${requestId}] Error message:`, errorMessage);
    console.error(`[${requestId}] Error stack:`, errorStack);

    return new Response(
      JSON.stringify({ error: errorMessage, requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
