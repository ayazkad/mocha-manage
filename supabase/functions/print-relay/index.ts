import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildPrinterUrl(raw: string): string {
  const value = (raw || "").trim();
  if (!value) throw new Error("Adresse du serveur d'impression manquante");

  // Accept:
  // - 192.168.1.187
  // - 192.168.1.187:3000
  // - 192.168.1.187:3000/print
  // - http://192.168.1.187:3000/print
  const hasScheme = /^https?:\/\//i.test(value);
  const url = new URL(hasScheme ? value : `http://${value}`);

  if (!url.port) url.port = "3000";
  if (!url.pathname || url.pathname === "/") url.pathname = "/print";

  return url.toString();
}

interface PrintRequest {
  text: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text }: PrintRequest = await req.json();

    if (!text) {
      console.error("No text provided for printing");
      return new Response(
        JSON.stringify({ success: false, message: "Aucun texte à imprimer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client to fetch printer settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch printer settings from database
    const { data: settings, error: settingsError } = await supabase
      .from("printer_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching printer settings:", settingsError);
      return new Response(
        JSON.stringify({ success: false, message: "Erreur lors de la récupération des paramètres d'impression" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings || !settings.printer_server_ip) {
      console.error("No printer settings configured");
      return new Response(
        JSON.stringify({ success: false, message: "Aucun serveur d'impression configuré" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const printerUrl = buildPrinterUrl(settings.printer_server_ip);
    console.log(`Sending print request to: ${printerUrl}`);

    // Make the HTTP request to the local print server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const printResponse = await fetch(printerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (printResponse.ok) {
        console.log("Print request successful");
        return new Response(
          JSON.stringify({ success: true, message: "Impression envoyée avec succès" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const errorText = await printResponse.text();
        console.error(`Print server error: ${printResponse.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ success: false, message: `Erreur serveur d'impression: ${printResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      const err = fetchError as Error;
      if (err.name === "AbortError") {
        console.error("Print request timed out");
        return new Response(
          JSON.stringify({ success: false, message: "Timeout: le serveur d'impression ne répond pas" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, message: `Erreur de connexion au serveur d'impression: ${err.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in print-relay function:", error);
    return new Response(
      JSON.stringify({ success: false, message: `Erreur: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
