import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LoyaltyQRRequest {
  customerName: string;
  customerEmail: string;
  qrCode: string;
  qrCodeImage: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, qrCode, qrCodeImage }: LoyaltyQRRequest = await req.json();

    console.log('Sending loyalty QR code to:', customerEmail);

    // Extract base64 data from data URL
    const base64Data = qrCodeImage.split(',')[1];

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Coffee Shop <onboarding@resend.dev>",
        to: [customerEmail],
        subject: "Votre carte de fidélité Coffee Shop ☕",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Bienvenue ${customerName}!</h1>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Merci de rejoindre notre programme de fidélité! Voici votre QR code personnel.
            </p>
            
            <div style="background: #f5f5f5; padding: 30px; text-align: center; border-radius: 10px; margin: 20px 0;">
              <img src="${qrCodeImage}" alt="QR Code de fidélité" style="max-width: 300px; width: 100%;" />
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">🎁 Comment ça marche ?</h3>
              <p style="color: #856404; margin: 0;">
                Présentez ce QR code à chaque achat. Après <strong>10 boissons</strong>, 
                la <strong>11ème est offerte</strong>!
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Conservez ce QR code précieusement et présentez-le à chaque visite. 
              Vous pouvez l'enregistrer sur votre téléphone ou l'imprimer.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">
                Coffee Shop - Votre café préféré<br>
                Des questions ? Contactez-nous en répondant à cet email.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await emailResponse.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-loyalty-qr function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);