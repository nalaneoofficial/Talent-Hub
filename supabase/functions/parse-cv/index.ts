// Parse a user's CV (PDF/DOC/DOCX) and extract structured profile data via Lovable AI.
// Auth: requires a valid JWT. Reads the CV from the user's `profiles.cv_path` in the `cvs` bucket.
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
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // Identify user from JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // Service-role client for storage download + profile update
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin.from("profiles").select("cv_path,cv_filename").eq("id", userId).maybeSingle();
    if (!profile?.cv_path) return json({ error: "No CV uploaded" }, 400);

    const ext = profile.cv_path.split(".").pop()?.toLowerCase();
    const { data: file, error: dlErr } = await admin.storage.from("cvs").download(profile.cv_path);
    if (dlErr || !file) return json({ error: "Could not read CV" }, 500);

    const buf = new Uint8Array(await file.arrayBuffer());
    let cvText = "";
    if (ext === "pdf") cvText = await extractPdfText(buf);
    else cvText = new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");

    cvText = cvText.replace(/\s+/g, " ").slice(0, 18000).trim();
    const letterCount = (cvText.match(/[a-zA-Z]/g) || []).length;
    const nativeOk = cvText.length >= 200 && letterCount >= 100;

    // If native text extraction is poor (e.g. scanned/image PDF), fall back to Gemini vision via Lovable AI gateway.
    let userContent: unknown = `Extract structured profile data from this CV text.\n\n---\n${cvText}\n---`;
    if (!nativeOk && ext === "pdf") {
      const b64 = base64Encode(buf);
      userContent = [
        { type: "text", text: "Extract structured profile data from this CV document." },
        { type: "image_url", image_url: { url: `data:application/pdf;base64,${b64}` } },
      ];
    } else if (cvText.length < 40) {
      return json({ error: "Could not read text from your CV. Try uploading a PDF with selectable text." }, 422);
    }

    // Call AI with structured tool-calling
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured information from CVs. Be conservative — never invent data. If a field is not present, omit it." },
          { role: "user", content: userContent as any },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_profile",
            description: "Save the extracted candidate profile.",
            parameters: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                current_job_title: { type: "string" },
                current_location: { type: "string" },
                years_experience: { type: "integer", minimum: 0, maximum: 60 },
                highest_qualification: { type: "string", description: "e.g. Bachelor's Degree, Master's Degree, Diploma, Certificate, PhD, Secondary School" },
                field_of_study: { type: "string" },
                skills: { type: "array", items: { type: "string" }, description: "5-20 distinct, concise skills" },
                summary: { type: "string", description: "2-3 sentence professional summary written in first person" },
              },
              required: ["skills"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_profile" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limit reached. Try again in a moment." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiResp.ok) return json({ error: "AI request failed" }, 500);

    const aiData = await aiResp.json();
    const args = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "No structured response from AI" }, 500);
    const extracted = JSON.parse(args);

    // Update profile with CV-extracted fields (don't overwrite manually-set fields)
    const { data: existing } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
    const update: Record<string, unknown> = {
      cv_extracted_skills: extracted.skills ?? [],
      cv_extracted_experience_years: extracted.years_experience ?? null,
      cv_extracted_qualification: extracted.highest_qualification ?? null,
      cv_summary: extracted.summary ?? null,
    };
    // Backfill empty fields from CV
    if (!existing?.full_name && extracted.full_name) update.full_name = extracted.full_name;
    if (!existing?.phone && extracted.phone) update.phone = extracted.phone;
    if (!existing?.current_job_title && extracted.current_job_title) update.current_job_title = extracted.current_job_title;
    if (!existing?.current_location && extracted.current_location) update.current_location = extracted.current_location;
    if (!existing?.highest_education && extracted.highest_qualification) update.highest_education = extracted.highest_qualification;
    if (!existing?.field_of_study && extracted.field_of_study) update.field_of_study = extracted.field_of_study;
    if ((!existing?.years_experience || existing.years_experience === 0) && typeof extracted.years_experience === "number")
      update.years_experience = extracted.years_experience;
    // Merge skills (manual + CV)
    const merged = Array.from(new Set([...(existing?.skills ?? []), ...(extracted.skills ?? [])].map((s: string) => s.trim()).filter(Boolean)));
    update.skills = merged;

    await admin.from("profiles").update(update).eq("id", userId);

    return json({ extracted, profile: update });
  } catch (e) {
    console.error("parse-cv error", e);
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

// Minimal PDF text extractor — pulls strings from content streams (works for most text-based PDFs).
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const text = new TextDecoder("latin1").decode(bytes);
  const out: string[] = [];
  // Match strings inside ( ... ) within BT/ET blocks
  const re = /\(((?:\\.|[^()\\])*)\)\s*Tj|\[((?:\\.|[^\]\\])*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1] ?? m[2] ?? "";
    // Strip TJ array kerning numbers and unwrap inner strings
    const cleaned = raw
      .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "", f: "", "(": "(", ")": ")", "\\": "\\" }[c] ?? c))
      .replace(/\)\s*-?\d+(\.\d+)?\s*\(/g, "")
      .replace(/[()]/g, "");
    if (cleaned.trim()) out.push(cleaned);
  }
  return out.join(" ");
}
