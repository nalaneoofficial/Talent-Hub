// Maps a job industry to a stable Unsplash hero image (free hotlink, no API key).
// Uses fixed photo IDs (not the deprecated source.unsplash.com) so cards never break.
const IMAGES: Record<string, string> = {
  technology: "photo-1518770660439-4636190af475",     // circuit board
  it: "photo-1518770660439-4636190af475",
  software: "photo-1461749280684-dccba630e2f6",       // code on screen
  developer: "photo-1461749280684-dccba630e2f6",
  finance: "photo-1611974789855-9c2a0a7236a3",        // calculator + coins
  banking: "photo-1601597111158-2fceff292cdc",        // bank vault / cash
  accounting: "photo-1554224155-6726b3ff858f",        // ledger
  healthcare: "photo-1576091160550-2173dba999ef",     // doctor stethoscope
  medical: "photo-1576091160550-2173dba999ef",
  nursing: "photo-1584516150909-c43483ee7932",
  education: "photo-1497633762265-9d179a990aa6",      // books
  teaching: "photo-1503676260728-1c00da094a0b",
  mining: "photo-1518709268805-4e9042af2176",         // industrial site
  retail: "photo-1441986300917-64674bd600d8",         // shop
  hospitality: "photo-1551632436-cbf8dd35adfa",       // hotel
  hotel: "photo-1551632436-cbf8dd35adfa",
  tourism: "photo-1488646953014-85cb44e25828",        // travel
  government: "photo-1541872703-74c5e44368f9",        // gov building
  ngo: "photo-1593113598332-cd288d649433",            // community
  agriculture: "photo-1500595046743-cd271d694d30",    // farm field
  construction: "photo-1541888946425-d81bb19240f5",   // construction site
  engineering: "photo-1581094488379-6c2f1f2c2a8b",    // engineering
  marketing: "photo-1551288049-bebda4e38f71",         // analytics
  legal: "photo-1589994965851-a8f479c573a9",          // law books
  logistics: "photo-1586528116311-ad8dd3c8310d",      // warehouse
  manufacturing: "photo-1581091226825-a6a2a5aee158",  // factory
  telecommunications: "photo-1519389950473-47ba0277781c", // network
  energy: "photo-1509391366360-2e959784a276",         // solar
  media: "photo-1485846234645-a62644f84728",          // camera/studio
};

const FALLBACK = "photo-1497366216548-37526070297c"; // generic office

export const industryImageUrl = (industry?: string | null, w = 800, h = 400): string => {
  const key = (industry ?? "").toLowerCase().trim();
  let id = FALLBACK;
  for (const k of Object.keys(IMAGES)) {
    if (key.includes(k)) { id = IMAGES[k]; break; }
  }
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
};
