const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cvText, cv_summary, target_keywords } = await req.json();
    const text: string = cvText ?? cv_summary ?? "";
    if (!text || text.length < 10) {
      return new Response(JSON.stringify({ error: "No CV text provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert ATS and HR consultant. Analyze this CV and return ONLY a JSON object, no markdown, no backticks, no other text:
{
  "score": <0-100 overall>,
  "keyword_score": <0-100>,
  "structure_score": <0-100>,
  "readability_score": <0-100>,
  "formatting_score": <0-100>,
  "feedback": ["specific point 1", "specific point 2", "specific point 3", "specific point 4", "specific point 5"]
}

Score strictly and realistically (typical CVs are 55-75; only exceptional CVs exceed 85). Each feedback item must reference actual content from the CV — not generic advice.

Target keywords: ${(target_keywords ?? []).join(", ") || "(none provided)"}

CV:
${text.slice(0, 4000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const err = await response.text();
      console.error("AI gateway error", response.status, err);
      throw new Error("AI gateway error: " + err);
    }

    const data = await response.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : clean);

    const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const result = {
      score: clamp(parsed.score),
      keyword_score: clamp(parsed.keyword_score),
      structure_score: clamp(parsed.structure_score),
      readability_score: clamp(parsed.readability_score),
      formatting_score: clamp(parsed.formatting_score),
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 8).map(String) : [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("score-cv error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "AI request failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
