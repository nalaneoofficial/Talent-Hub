// Extract structured job posting data from an uploaded document (PDF/DOC/TXT) via Lovable AI.
// Auth: requires authenticated admin user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    // Verify admin
    const { data: roles } = await userClient
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "No file" }, 400);

    const buf = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();
    let text = "";
    if (ext === "pdf") text = extractPdfText(buf);
    else text = new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
    text = text.replace(/\s+/g, " ").slice(0, 18000).trim();
    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    const nativeOk = text.length >= 200 && letters >= 100;

    let userMessage: unknown = `Extract job posting fields from this document.\n\n---\n${text}\n---`;
    if (!nativeOk && ext === "pdf") {
      const b64 = base64Encode(buf);
      userMessage = [
        { type: "text", text: "Extract job posting fields from this document." },
        { type: "image_url", image_url: { url: `data:application/pdf;base64,${b64}` } },
      ];
    } else if (text.length < 40) {
      return json({ error: "Could not read text from the document." }, 422);
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract structured job posting data. Be conservative — never invent facts. Omit fields not present." },
          { role: "user", content: userMessage as any },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_job",
            description: "Save the extracted job posting.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                company: { type: "string" },
                location: { type: "string" },
                industry: { type: "string" },
                employment_type: { type: "string", description: "Full-time, Part-time, Contract, Internship" },
                salary_range: { type: "string" },
                description: { type: "string" },
                skills: { type: "array", items: { type: "string" } },
                application_email: { type: "string" },
                hiring_contact_name: { type: "string" },
                required_qualification: { type: "string" },
                required_years_experience: { type: "integer", minimum: 0, maximum: 60 },
                application_deadline: { type: "string", description: "ISO date if specified" },
              },
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_job" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limit reached." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiResp.ok) return json({ error: "AI request failed" }, 500);

    const aiData = await aiResp.json();
    const args = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "No structured response from AI" }, 500);
    const job = JSON.parse(args);
    return json({ job });
  } catch (e) {
    console.error("extract-job error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function base64Encode(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractPdfText(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes);
  const out: string[] = [];
  const re = /\(((?:\\.|[^()\\])*)\)\s*Tj|\[((?:\\.|[^\]\\])*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1] ?? m[2] ?? "";
    const cleaned = raw
      .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "", f: "", "(": "(", ")": ")", "\\": "\\" }[c] ?? c))
      .replace(/\)\s*-?\d+(\.\d+)?\s*\(/g, "")
      .replace(/[()]/g, "");
    if (cleaned.trim()) out.push(cleaned);
  }
  return out.join(" ");
}
