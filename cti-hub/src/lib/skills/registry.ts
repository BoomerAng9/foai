export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export const SKILLS: Skill[] = [
  {
    id: 'use-case-assessment',
    name: 'Use Case Assessment',
    description: '4-phase consultation to validate your idea',
    prompt: 'I want to run a Use Case Assessment. Start with Phase 1: Share Your Idea. Ask me to describe my business problem, industry, and target audience.',
  },
  {
    id: 'competitive-brief',
    name: 'Competitive Brief',
    description: 'Research competitors and build a positioning report',
    prompt: 'Build me a competitive brief. Research the top 5 competitors in my space, analyze their pricing, features, and positioning, then deliver a structured report.',
  },
  {
    id: 'business-plan',
    name: 'Business Plan',
    description: 'Generate a lean business plan from a prompt',
    prompt: 'Help me create a lean business plan. Walk me through: problem, solution, target market, revenue model, and go-to-market strategy.',
  },
  {
    id: 'pitch-deck',
    name: 'Pitch Deck',
    description: 'Create a pitch deck outline with talking points',
    prompt: 'Create a 10-slide pitch deck outline for my business. Include: problem, solution, market size, business model, traction, team, financials, and ask.',
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: '30-day social media content plan',
    prompt: 'Build me a 30-day content calendar for social media. Ask me about my brand, audience, and goals first, then generate the full calendar with post ideas.',
  },
  {
    id: 'seo-audit',
    name: 'SEO Audit',
    description: 'Analyze a website for SEO improvements',
    prompt: "Run an SEO audit on my website. I'll provide the URL. Analyze: page speed, meta tags, content quality, backlink opportunities, and keyword gaps.",
  },
];
