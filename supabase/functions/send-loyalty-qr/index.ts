import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import QRCode from "npm:qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoyaltyQRRequest {
  customerId: string;
  customerEmail: string;
  customerName: string;
  qrCode: string;
  language?: 'en' | 'ru' | 'ge';
}

const translations = {
  en: {
    subject: "Welcome to Our Loyalty Program! 🎉",
    greeting: "Hello",
    welcome: "Welcome to our loyalty program!",
    intro: "Thank you for joining our loyalty program. You can now start earning points with every purchase!",
    howItWorks: "How it works:",
    step1: "Show your QR code at checkout",
    step2: "Earn 1 point for each item purchased",
    step3: "Get a free drink after collecting 10 points",
    qrTitle: "Your Personal QR Code:",
    qrInstruction: "Save this QR code on your phone or screenshot this email. Show it at the register to collect points.",
    footer: "Thank you for your loyalty!",
    regards: "Best regards,<br>Café POS Team",
  },
  ru: {
    subject: "Добро пожаловать в программу лояльности! 🎉",
    greeting: "Здравствуйте",
    welcome: "Добро пожаловать в нашу программу лояльности!",
    intro: "Спасибо, что присоединились к нашей программе лояльности. Теперь вы можете зарабатывать баллы с каждой покупкой!",
    howItWorks: "Как это работает:",
    step1: "Покажите свой QR-код на кассе",
    step2: "Зарабатывайте 1 балл за каждый купленный товар",
    step3: "Получите бесплатный напиток после накопления 10 баллов",
    qrTitle: "Ваш персональный QR-код:",
    qrInstruction: "Сохраните этот QR-код на телефоне или сделайте скриншот письма. Покажите его на кассе для накопления баллов.",
    footer: "Спасибо за вашу лояльность!",
    regards: "С уважением,<br>Команда Café POS",
  },
  ge: {
    subject: "მოგესალმებით ჩვენს ლოიალურობის პროგრამაში! 🎉",
    greeting: "გამარჯობა",
    welcome: "კეთილი იყოს თქვენი მობრძანება ჩვენს ლოიალურობის პროგრამაში!",
    intro: "გმადლობთ, რომ შეუერთდით ჩვენს ლოიალურობის პროგრამას. ახლა შეგიძლიათ დააგროვოთ ქულები ყოველი შენაძენით!",
    howItWorks: "როგორ მუშაობს:",
    step1: "აჩვენეთ თქვენი QR კოდი კასაზე",
    step2: "მიიღეთ 1 ქულა ყოველი შეძენილი პროდუქტისთვის",
    step3: "მიიღეთ უფასო სასმელი 10 ქულის შეგროვების შემდეგ",
    qrTitle: "თქვენი პერსონალური QR კოდი:",
    qrInstruction: "შეინახეთ ეს QR კოდი თქვენს ტელეფონში ან გააკეთეთ ეკრანის ფოტო. აჩვენეთ იგი კასაზე ქულების დასაგროვებლად.",
    footer: "გმადლობთ თქვენი ლოიალურობისთვის!",
    regards: "პატივისცემით,<br>Café POS გუნდი",
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      customerEmail, 
      customerName, 
      qrCode,
      language = 'en'
    }: LoyaltyQRRequest = await req.json();

    console.log("Generating QR code for customer:", customerEmail);

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(qrCode, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      type: 'png',
    });

    // Convert buffer to base64
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)));

    const t = translations[language] || translations.en;

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #6B4423;
              margin: 0;
            }
            .qr-container {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: #f9f9f9;
              border-radius: 8px;
            }
            .qr-container img {
              max-width: 300px;
              height: auto;
            }
            .instructions {
              background: #f0f0f0;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .instructions h2 {
              color: #6B4423;
              margin-top: 0;
            }
            .instructions ul {
              padding-left: 20px;
            }
            .instructions li {
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.welcome}</h1>
            </div>
            
            <p>${t.greeting} ${customerName},</p>
            
            <p>${t.intro}</p>
            
            <div class="instructions">
              <h2>${t.howItWorks}</h2>
              <ul>
                <li>${t.step1}</li>
                <li>${t.step2}</li>
                <li>${t.step3}</li>
              </ul>
            </div>
            
            <div class="qr-container">
              <h2>${t.qrTitle}</h2>
              <img src="cid:qrcode" alt="Your QR Code" style="max-width: 300px; height: auto;" />
              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                ${t.qrInstruction}
              </p>
            </div>
            
            <div class="footer">
              <p><strong>${t.footer}</strong></p>
              <p>${t.regards}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Café POS <onboarding@resend.dev>",
        to: [customerEmail],
        subject: t.subject,
        html: emailHtml,
        attachments: [
          {
            filename: 'qrcode.png',
            content: base64Data,
            content_id: 'qrcode',
          },
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
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
