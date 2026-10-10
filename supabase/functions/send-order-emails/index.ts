const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_EMAIL = 'tu-correo@gmail.com' // ← cambia esto por tu correo real

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'LORCAM <hola@lorcam.com.mx>',
      to,
      subject,
      html,
    }),
  })
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order, buyer, cart, total } = await req.json()

    const itemsHtml = cart.map((i: any) =>
      `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#444">${i.product.name} × ${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#4A5D23">$${(i.product.price * i.quantity).toFixed(2)}</td>
      </tr>`
    ).join('')

    // ── Email al comprador ──
    const buyerHtml = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <img src="https://lorcam.com/Logo.jpeg" alt="LORCAM" style="width:56px;height:56px;border-radius:50%;margin-bottom:16px" />
        <h1 style="font-size:22px;font-weight:900;color:#1a1a1a;margin:0 0 8px">¡Gracias por tu compra, ${buyer.name}!</h1>
        <p style="color:#666;margin:0 0 24px">Tu pedido ha sido recibido y está siendo procesado.</p>

        <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Resumen del pedido</p>
          <table style="width:100%;border-collapse:collapse">
            ${itemsHtml}
            <tr>
              <td style="padding-top:12px;font-weight:900;color:#1a1a1a">Total pagado</td>
              <td style="padding-top:12px;text-align:right;font-weight:900;color:#4A5D23;font-size:18px">$${total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Dirección de envío</p>
          <p style="color:#444;margin:0">${buyer.address}</p>
          <p style="color:#444;margin:4px 0 0">${buyer.city}, C.P. ${buyer.zip}</p>
        </div>

        <p style="color:#666;font-size:14px">Nos pondremos en contacto contigo pronto para coordinar el envío. Si tienes dudas, escríbenos por WhatsApp al <strong>81 2027 8645</strong>.</p>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
        <p style="color:#aaa;font-size:12px;text-align:center">LORCAM · Lombriz Roja Californiana · Monterrey, NL</p>
      </div>
    `

    // ── Email al administrador ──
    const adminHtml = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;font-weight:900;color:#1a1a1a;margin:0 0 4px">🛒 Nueva orden recibida</h1>
        <p style="color:#666;margin:0 0 24px;font-size:14px">Se realizó un pago exitoso en LORCAM.</p>

        <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:16px">
          <p style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;margin:0 0 12px">Cliente</p>
          <p style="color:#1a1a1a;font-weight:700;margin:0">${buyer.name}</p>
          <p style="color:#666;margin:4px 0 0;font-size:14px">${buyer.email} · ${buyer.phone}</p>
          <p style="color:#666;margin:4px 0 0;font-size:14px">${buyer.address}, ${buyer.city} C.P. ${buyer.zip}</p>
        </div>

        <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:16px">
          <p style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;margin:0 0 12px">Productos</p>
          <table style="width:100%;border-collapse:collapse">
            ${itemsHtml}
            <tr>
              <td style="padding-top:12px;font-weight:900;color:#1a1a1a">Total</td>
              <td style="padding-top:12px;text-align:right;font-weight:900;color:#4A5D23;font-size:18px">$${total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <p style="color:#aaa;font-size:12px">ID Stripe: ${order?.stripe_payment_id ?? '—'}</p>
      </div>
    `

    await Promise.all([
      sendEmail(buyer.email, '¡Tu pedido en LORCAM fue recibido!', buyerHtml),
      sendEmail(ADMIN_EMAIL, `Nueva orden de ${buyer.name} — $${total.toFixed(2)}`, adminHtml),
    ])

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})