/**
 * Contact Page Prompt
 * Generates dedicated Contact pages with form and contact information display
 */

export interface ContactPageRequirements {
  companyName?: string;
  logoUrl?: string | null;
  brandColors?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
}

export const CONTACT_PAGE_SYSTEM_PROMPT = `You are an expert web designer creating a professional Contact Us page.

CRITICAL DESIGN RULES:
1. Use ONLY inline Tailwind CSS classes (no external stylesheets)
2. Include Feather Icons via CDN: <script src="https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js"></script>
3. Must be fully responsive (mobile-first with sm:, md:, lg: breakpoints)
4. Include complete HTML structure (<!DOCTYPE html>, head, body)
5. Use provided brand colors for primary elements
6. All icons via <i data-feather="icon-name"></i>

JAVASCRIPT REQUIREMENTS:
1. Initialize Feather icons: feather.replace()
2. Form submission must POST to /api/widget/leads
3. Show loading state during submission
4. Display success/error messages
5. Reset form on success`;

export function generateContactPagePrompt(requirements: ContactPageRequirements): string {
  const { companyName, logoUrl, brandColors, contactInfo, socialMedia } = requirements;

  const prompt = `Create a professional Contact Us page for ${companyName || "our company"}.

BRAND COLORS: ${brandColors || "Use indigo-600 as primary"}

PAGE STRUCTURE:

1. HEADER/NAVBAR:
   - Logo: ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}">` : `<span class="text-2xl font-bold">${companyName}</span>`}
   - Links: Home, About, Contact (current page - highlighted)
   - Mobile hamburger menu
   - Sticky positioning: sticky top-0 z-50

2. HERO SECTION:
   - Dark gradient background: bg-gradient-to-br from-slate-900 to-gray-900
   - Headline: "Get In Touch" (text-5xl font-bold text-white)
   - Subheading: "We'd love to hear from you" (text-xl text-gray-300)
   - Centered layout with py-20

3. CONTACT INFO + FORM GRID (2 columns on desktop, stack on mobile):

   LEFT COLUMN - Contact Information Cards:
   ${
     contactInfo?.email
       ? `
   <div class="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md">
     <div class="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
       <i data-feather="mail" class="w-6 h-6 text-indigo-600"></i>
     </div>
     <div>
       <h3 class="font-semibold text-gray-900">Email</h3>
       <a href="mailto:${contactInfo.email}" class="text-indigo-600 hover:underline">${contactInfo.email}</a>
     </div>
   </div>`
       : ""
   }

   ${
     contactInfo?.phone
       ? `
   <div class="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md">
     <div class="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
       <i data-feather="phone" class="w-6 h-6 text-indigo-600"></i>
     </div>
     <div>
       <h3 class="font-semibold text-gray-900">Phone</h3>
       <a href="tel:${contactInfo.phone}" class="text-indigo-600 hover:underline">${contactInfo.phone}</a>
     </div>
   </div>`
       : ""
   }

   ${
     contactInfo?.address
       ? `
   <div class="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md">
     <div class="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
       <i data-feather="map-pin" class="w-6 h-6 text-indigo-600"></i>
     </div>
     <div>
       <h3 class="font-semibold text-gray-900">Address</h3>
       <p class="text-gray-600">${contactInfo.address}</p>
     </div>
   </div>`
       : ""
   }

   RIGHT COLUMN - Contact Form:
   <form id="contact-form" class="space-y-4 p-8 bg-white rounded-xl shadow-xl">
     <div>
       <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
       <input
         type="text"
         id="name"
         name="name"
         required
         class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
       >
     </div>

     <div>
       <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
       <input
         type="email"
         id="email"
         name="email"
         required
         class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
       >
     </div>

     <div>
       <label for="company" class="block text-sm font-medium text-gray-700 mb-1">Company</label>
       <input
         type="text"
         id="company"
         name="company"
         class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
       >
     </div>

     <div>
       <label for="message" class="block text-sm font-medium text-gray-700 mb-1">Message *</label>
       <textarea
         id="message"
         name="message"
         rows="4"
         required
         class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
       ></textarea>
     </div>

     <button
       type="submit"
       id="submit-btn"
       class="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
     >
       Send Message
     </button>

     <div id="form-status" class="hidden text-center text-sm p-3 rounded-lg"></div>
   </form>

4. SOCIAL MEDIA SECTION (if provided):
   ${
     Object.keys(socialMedia || {}).filter((k) => socialMedia?.[k as keyof typeof socialMedia])
       .length > 0
       ? `
   - Display icons for: ${Object.keys(socialMedia || {})
     .filter((k) => socialMedia?.[k as keyof typeof socialMedia])
     .join(", ")}
   - Links open in new tab
   - Hover effects with scale`
       : ""
   }

5. FOOTER:
   - Copyright notice
   - Quick links
   - Social media icons

JAVASCRIPT (place before </body>):
<script>
// Initialize Feather icons
feather.replace();

// Form submission handler
document.getElementById('contact-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  const statusDiv = document.getElementById('form-status');
  const formData = new FormData(this);

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  statusDiv.classList.add('hidden');

  try {
    const response = await fetch('/api/widget/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: '\${siteId}',  // Will be replaced by generation service
        email: formData.get('email'),
        name: formData.get('name'),
        company: formData.get('company'),
        message: formData.get('message'),
        formType: 'contact',
        sourcePage: 'contact',
        sourceSegment: 'contact',
      })
    });

    const result = await response.json();

    if (response.ok) {
      statusDiv.textContent = result.message || 'Thank you! We will be in touch soon.';
      statusDiv.className = 'block text-center text-sm p-3 rounded-lg bg-green-50 text-green-700';
      this.reset();
    } else {
      statusDiv.textContent = result.error || 'Something went wrong. Please try again.';
      statusDiv.className = 'block text-center text-sm p-3 rounded-lg bg-red-50 text-red-700';
    }
  } catch (error) {
    statusDiv.textContent = 'Network error. Please check your connection and try again.';
    statusDiv.className = 'block text-center text-sm p-3 rounded-lg bg-red-50 text-red-700';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  }
});
</script>

Generate the complete HTML now.`;

  return prompt;
}
