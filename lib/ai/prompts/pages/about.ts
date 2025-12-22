/**
 * About Page Prompt
 * Generates dedicated About pages with company information
 */

export interface AboutPageRequirements {
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  aboutInfo?: {
    companyHistory?: string;
    missionStatement?: string;
    visionStatement?: string;
    companyValues?: string;
  };
}

export const ABOUT_PAGE_SYSTEM_PROMPT = `You are an expert web designer creating a professional About Us page.

CRITICAL DESIGN RULES:
1. Use ONLY inline Tailwind CSS classes (no external stylesheets)
2. Include Feather Icons via CDN: <script src="https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js"></script>
3. Must be fully responsive (mobile-first with sm:, md:, lg: breakpoints)
4. Include complete HTML structure (<!DOCTYPE html>, head, body)
5. Use provided brand colors for primary elements
6. All icons via <i data-feather="icon-name"></i>

JAVASCRIPT REQUIREMENTS:
1. Initialize Feather icons: feather.replace()`;

export function generateAboutPagePrompt(requirements: AboutPageRequirements): string {
  const { companyName, logoUrl, brandColors, aboutInfo } = requirements;

  const prompt = `Create a compelling About Us page for ${companyName || "our company"}.

BRAND COLORS: ${brandColors || "Use indigo-600 as primary"}

PAGE STRUCTURE:

1. HEADER/NAVBAR:
   - Logo: ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}">` : `<span class="text-2xl font-bold">${companyName}</span>`}
   - Links: Home, About (current page - highlighted), Contact
   - Mobile hamburger menu
   - Sticky positioning: sticky top-0 z-50

2. HERO SECTION:
   - Logo: ${logoUrl || `Company name in large text`}
   - Headline: "About ${companyName}" (text-5xl font-bold)
   - Subheading: "Building the future together" or similar tagline
   - Background: gradient from primary brand color
   - Centered layout with py-20

3. OUR STORY SECTION:
   ${
     aboutInfo?.companyHistory
       ? `
   - Full-width section with prose formatting
   - Title: "Our Story" (text-3xl font-bold)
   - Content: ${aboutInfo.companyHistory}
   - Background: bg-white
   - Add timeline elements if dates are mentioned in the content
   - Use elegant typography with leading-relaxed for readability
   - Max width container (max-w-4xl mx-auto)
   `
       : `
   - Display generic company story section
   - Title: "Our Story"
   - Generic text: "We are dedicated to providing excellent solutions and services to our clients..."
   - Background: bg-white`
   }

4. MISSION & VISION (side-by-side cards on desktop, stack on mobile):
   <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">

   ${
     aboutInfo?.missionStatement
       ? `
   <!-- Mission Card -->
   <div class="p-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-xl">
     <div class="flex items-center mb-4">
       <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
         <i data-feather="target" class="w-6 h-6"></i>
       </div>
       <h3 class="ml-4 text-2xl font-bold">Our Mission</h3>
     </div>
     <p class="text-lg leading-relaxed">${aboutInfo.missionStatement}</p>
   </div>`
       : ""
   }

   ${
     aboutInfo?.visionStatement
       ? `
   <!-- Vision Card -->
   <div class="p-8 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl shadow-xl">
     <div class="flex items-center mb-4">
       <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
         <i data-feather="eye" class="w-6 h-6"></i>
       </div>
       <h3 class="ml-4 text-2xl font-bold">Our Vision</h3>
     </div>
     <p class="text-lg leading-relaxed">${aboutInfo.visionStatement}</p>
   </div>`
       : ""
   }

   </div>

5. OUR VALUES SECTION:
   ${
     aboutInfo?.companyValues
       ? `
   - Title: "Our Values" (text-3xl font-bold text-center)
   - Split values by comma or line break: ${aboutInfo.companyValues}
   - Display each value as a card with:
     * Icon (choose appropriate feather icon for each value)
     * Value name as heading
     * Brief description if space allows
   - Grid layout: 3-4 columns on desktop, 2 on tablet, 1 on mobile
   - Each card: p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition
   - Add hover effects with scale
   `
       : `
   - Display generic values: Innovation, Integrity, Excellence, Collaboration
   - Grid with icon cards as described above`
   }

6. CTA SECTION:
   - Background: gradient or accent color
   - Headline: "Ready to Work Together?" or "Get In Touch"
   - Button: "Contact Us" linking to /contact or contact page
   - Centered layout
   - Padding: py-20

7. FOOTER:
   - Copyright notice: © ${new Date().getFullYear()} ${companyName || "Company Name"}. All rights reserved.
   - Quick links: Home, About, Contact
   - Social media icons (if provided)
   - Background: bg-gray-900 text-white

JAVASCRIPT (place before </body>):
<script>
// Initialize Feather icons
feather.replace();
</script>

IMPORTANT STYLING NOTES:
- Use consistent spacing: section padding py-16 or py-20
- Card shadows: shadow-md for default, shadow-xl for emphasis
- Rounded corners: rounded-xl for cards, rounded-2xl for hero cards
- Typography hierarchy:
  * Page title: text-5xl font-bold
  * Section titles: text-3xl font-bold
  * Subsection titles: text-2xl font-bold
  * Body text: text-base or text-lg leading-relaxed
- Color palette: Use brand colors for accents, gray scale for text
- Transitions: add "transition duration-300" for hover effects

Generate the complete HTML now.`;

  return prompt;
}
