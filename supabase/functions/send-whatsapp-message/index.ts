import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessageRequest {
  to: string;
  message: string;
  type: 'delivery' | 'withdrawal';
  deliveryData?: {
    codigo: string;
    morador: string;
    apartamento: string;
    bloco?: string;
    observacoes?: string;
    foto?: string;
    foto_base64?: string;
    foto_data_url?: string;
    foto_mime?: string;
  };
  withdrawalData?: {
    codigo: string;
    morador: string;
    apartamento: string;
    bloco?: string;
    descricao?: string;
    data: string;
    hora: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, type, deliveryData, withdrawalData }: WhatsAppMessageRequest = await req.json();

    console.log('Sending WhatsApp message:', { to, type, deliveryData, withdrawalData });

    // Send to n8n webhook
    const webhookUrl = 'https://n8n-webhook.xdc7yi.easypanel.host/webhook/portariainteligente';
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to,
        message: message,
        type: type,
        deliveryData: deliveryData,
        withdrawalData: withdrawalData,
        timestamp: new Date().toISOString()
      }),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    const result = await webhookResponse.json();
    console.log('WhatsApp message sent successfully:', result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'WhatsApp message sent successfully',
      result: result 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-whatsapp-message function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);