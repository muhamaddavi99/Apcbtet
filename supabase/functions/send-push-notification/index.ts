import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
}

// Helper to create proper ArrayBuffer
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(arr.length);
  new Uint8Array(buf).set(arr);
  return buf;
}

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function generateVapidJwt(audience: string, subject: string, publicKey: string, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64UrlDecode(privateKey);
  const publicKeyBytes = base64UrlDecode(publicKey);
  
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: base64UrlEncode(privateKeyBytes),
  };

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsignedToken));
  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const saltBuf = salt.length ? toArrayBuffer(salt) : new ArrayBuffer(32);
  const prkKey = await crypto.subtle.importKey('raw', saltBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, toArrayBuffer(ikm)));
  
  const expandKey = await crypto.subtle.importKey('raw', toArrayBuffer(prk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoWithCounter = new Uint8Array([...info, 1]);
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', expandKey, toArrayBuffer(infoWithCounter)));
  return okm.slice(0, length);
}

async function encryptPayload(payload: string, p256dh: string, auth: string): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const localKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey));

  const subPubBytes = base64UrlDecode(p256dh);
  const subPubKey = await crypto.subtle.importKey('raw', toArrayBuffer(subPubBytes), { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: subPubKey }, localKeyPair.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const authBytes = base64UrlDecode(auth);

  const ikmInfo = new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...subPubBytes, ...localPublicKey]);
  const ikm = await hkdf(authBytes, sharedSecret, ikmInfo, 32);
  const cek = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  const paddedPayload = new Uint8Array([...new TextEncoder().encode(payload), 2]);
  const aesKey = await crypto.subtle.importKey('raw', toArrayBuffer(cek), { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(nonce) }, aesKey, toArrayBuffer(paddedPayload)));

  return { encrypted, salt, localPublicKey };
}

function buildBody(encrypted: Uint8Array, salt: Uint8Array, localPublicKey: Uint8Array): Uint8Array {
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(localPublicKey, 21);
  return new Uint8Array([...header, ...encrypted]);
}

async function sendPush(endpoint: string, p256dh: string, auth: string, payload: NotificationPayload, vapidPub: string, vapidPriv: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(endpoint);
    const jwt = await generateVapidJwt(`${url.protocol}//${url.host}`, 'mailto:kaakangsatir@gmail.com', vapidPub, vapidPriv);
    const { encrypted, salt, localPublicKey } = await encryptPayload(JSON.stringify(payload), p256dh, auth);
    const body = buildBody(encrypted, salt, localPublicKey);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPub}`,
      },
      body: toArrayBuffer(body),
    });

    if (!response.ok) return { success: false, error: `${response.status}: ${await response.text()}` };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY')!;

    console.log('VAPID Public Key configured:', !!vapidPub);
    console.log('VAPID Private Key configured:', !!vapidPriv);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { user_ids, notification } = body as { user_ids?: string[]; notification: NotificationPayload };

    console.log('Sending push:', notification.title);
    console.log('Target user_ids:', user_ids || 'all users');

    if (!notification?.title || !notification?.body) {
      return new Response(JSON.stringify({ success: false, error: 'Missing title or body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let query = supabase.from('push_subscriptions').select('*');
    if (user_ids?.length) query = query.in('user_id', user_ids);

    const { data: subs, error: subsErr } = await query;
    console.log('Subscriptions found:', subs?.length || 0);
    
    if (subsErr) {
      console.error('Error fetching subscriptions:', subsErr);
      throw subsErr;
    }

    if (!subs?.length) {
      console.log('No subscriptions found, returning sent: 0');
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'Tidak ada perangkat yang terdaftar untuk menerima notifikasi' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const sub of subs) {
      console.log('Sending to endpoint:', sub.endpoint.substring(0, 50) + '...');
      const result = await sendPush(sub.endpoint, sub.p256dh, sub.auth, notification, vapidPub, vapidPriv);
      console.log('Push result:', result.success ? 'success' : `failed: ${result.error}`);
      
      if (!result.success && (result.error?.includes('410') || result.error?.includes('404'))) {
        console.log('Removing expired subscription');
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
      results.push({ userId: sub.user_id, ...result });
    }

    const successCount = results.filter(r => r.success).length;
    console.log('Final results - Success:', successCount, 'Failed:', results.length - successCount);
    
    return new Response(JSON.stringify({ success: true, sent: successCount, failed: results.length - successCount, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
