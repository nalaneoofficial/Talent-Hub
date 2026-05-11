import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require authenticated user (prevents AI quota abuse)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job, profile } = await req.json();
    if (!job || !profile) {
      return new Response(JSON.stringify({ error: "Missing job or profile" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const allSkills = Array.from(new Set([
      ...(profile.skills ?? []),
      ...(profile.cv_extracted_skills ?? []),
    ].map((s: string) => s.trim()).filter(Boolean)));

    const userInputs = profile.user_inputs ?? profile.achievements ?? "";

    const prompt = `You are a professional cover letter writer. Use:
- Job Title: ${job.title}
- Company: ${job.company}
- Job Requirements: ${job.description}
- Candidate CV: ${profile.cv_summary ?? "N/A"}
- Candidate Name: ${profile.full_name ?? "Applicant"}
- Candidate Skills: ${allSkills.join(", ")}
- Candidate Achievements: ${userInputs}

Do not be generic. Match specific skills to the job. Include one measurable achievement. Keep under 400 words. Confident professional tone.

Structure:
1. Strong opening
2. Skills match
3. Achievement
4. Enthusiastic closing

Output ONLY the body paragraphs of the cover letter. Do NOT include addresses, dates, salutations ("Dear..."), the "RE:" line, or any sign-off ("Yours faithfully", names) — the app adds those. Plain text, no markdown, no placeholder brackets, normal sentence case.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = (data?.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ coverLetter: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cover-letter error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
