"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicScriptService = void 0;
exports.getTopicScriptService = getTopicScriptService;
const config_1 = require("../constants/config");
class TopicScriptService {
    constructor() {
        this.apiKey = config_1.API_KEYS.GROQ || '';
        this.baseUrl = 'https://api.groq.com/openai/v1';
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey.startsWith('gsk_');
    }
    /**
     * Generate a complete script from a topic/keyword
     */
    async generateScript(options) {
        if (!this.isAvailable()) {
            console.warn('Groq API key not configured for topic-to-script');
            return null;
        }
        try {
            const prompt = this.buildScriptPrompt(options);
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert viral content script writer for faceless YouTube/shorts videos. 
Generate engaging, scroll-stopping scripts that hook viewers in the first 3 seconds.
Write in a natural, conversational tone that feels like a real person speaking.
Keep sentences short and punchy for better voiceover pacing.
Include strategic pauses for visual storytelling.
Output ONLY valid JSON in the exact format specified.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                }),
            });
            if (!response.ok) {
                throw new Error(`Groq API error: ${response.status}`);
            }
            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content in response');
            }
            // Parse JSON response
            const script = JSON.parse(content);
            console.log(`✅ Script generated: "${script.title}" (${script.estimatedDuration}s)`);
            return script;
        }
        catch (error) {
            console.error('Script generation error:', error.message);
            return null;
        }
    }
    /**
     * Build the prompt for script generation
     */
    buildScriptPrompt(options) {
        const { topic, niche, tone, length, language } = options;
        const lengthWords = {
            short: '150-250 words (30-45 seconds)',
            medium: '300-500 words (1-2 minutes)',
            long: '600-900 words (3-5 minutes)'
        };
        const toneStyles = {
            educational: 'informative and authoritative, sharing valuable insights',
            entertaining: 'fun and engaging, using storytelling and humor',
            motivational: 'inspiring and uplifting, driving action',
            controversial: 'provocative and attention-grabbing, sparking debate',
            informative: 'clear and concise, presenting facts'
        };
        return `Generate a viral faceless video script about: "${topic}"

Context:
- Niche: ${niche || 'General'}
- Tone: ${tone || 'educational'} - ${toneStyles[tone] || toneStyles.educational}
- Length: ${lengthWords[length] || lengthWords.medium}
- Language: ${language || 'English'}

Requirements:
1. Start with a BANGING hook (first 3 seconds - no intro, just attention)
2. Main content should flow naturally and keep viewers watching
3. End with a clear call-to-action
4. Include 5-8 relevant hashtags at the end
5. Estimated duration should match the word count at typical speaking pace

Return ONLY this JSON format (no markdown, no explanation):
{
  "title": "Engaging Video Title",
  "sections": {
    "hook": "The first 2-3 sentences that grab attention (15-30 words)",
    "mainContent": "The bulk of the content (body paragraphs)",
    "callToAction": "Final message asking viewer to subscribe, like, or comment"
  },
  "hashtags": ["#topic1", "#topic2", "#relevant", "#viral", "#faceless"],
  "estimatedDuration": 90
}`;
    }
    /**
     * Get suggested topics based on a niche
     */
    async getSuggestedTopics(niche, count = 5) {
        if (!this.isAvailable()) {
            return this.getDefaultTopics(niche);
        }
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a viral content strategist. Generate popular video topics.'
                        },
                        {
                            role: 'user',
                            content: `Generate ${count} viral faceless video topics for the "${niche}" niche. 
Return ONLY a JSON array of strings with no markdown formatting.
Example: ["Topic 1", "Topic 2", "Topic 3"]`
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 500,
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to generate topics');
            }
            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            return JSON.parse(content || '[]');
        }
        catch (error) {
            console.warn('Topic generation failed, using defaults');
            return this.getDefaultTopics(niche);
        }
    }
    /**
     * Default topics when API is not available
     */
    getDefaultTopics(niche) {
        const topicTemplates = {
            'scary_stories': [
                'The Creepiest Unexplained Sound Ever Recorded',
                'What I Found Behind My Walls at Night',
                'People Who Vanished Without a Trace',
                'The Sleepover That Went Wrong',
                'Objects That Should Not Exist'
            ],
            'true_crime': [
                'The Unsolved Murder That Still Haunts This Town',
                'How a Fingerprint Solved a 30-Year-Old Case',
                'The Wrongful Conviction That Shocked Everyone',
                'Cold Case Files: The Girl in the Woods',
                'The Disappearance Everyone Forgot'
            ],
            'real_tragedies': [
                'The Last Words Survivors Said',
                'Tragic Events That Changed Lives Forever',
                'What Really Happened That Day',
                'Heroes Who Died Saving Others',
                'The Story Nobody Wanted to Tell'
            ],
            'anime_stories': [
                'The Dark Origin of Your Favorite Character',
                'What the Ending Really Meant',
                'Scenes That Were Too Intense to Air',
                'The Creator Secretly Hid This Message',
                'Fans Were Never the Same After This Episode'
            ],
            'heists': [
                'The Perfect Crime Nobody Solved',
                'How They Stole Millions in Plain Sight',
                'The Heist That Went Wrong',
                'Robbers Who Got Away With Everything',
                'The Smartest Criminals in History'
            ],
            'Motivation': [
                '5 Morning Habits That Changed My Life',
                'Why Youre Not Successful Yet',
                'The Only Productivity Hack You Need',
                'Stop Making This Mistake',
                'Life Lessons From 90-Year-Olds'
            ],
            'Technology': [
                'AI Just Changed Everything',
                'The Future of Work',
                'Why Programming Matters',
                'Tech Trends to Watch in 2026',
                'How AI Will Replace Jobs'
            ],
            'History': [
                'The Most Interesting Fact About History',
                'What They Dont Teach You About History',
                'The Truth About Historical Events',
                'Historical Events That Changed Everything',
                'Ancient Secrets Revealed'
            ],
            'Science': [
                'Mind-Blowing Science Facts',
                'The Science Behind Success',
                'Why Your Brain Lies to You',
                'The Universe Explained Simply',
                'Science Facts That Sound Fake'
            ],
            'Business': [
                'How to Start With $0',
                'Business Models That Work',
                'The Rich Think Differently',
                'Side Hustles That Actually Work',
                'Money Mistakes to Avoid'
            ],
            'Health': [
                'Health Myths Busted',
                'The Morning Routine Experts Recommend',
                'Why Youre Always Tired',
                'Simple Health Hacks That Work',
                'The Truth About Dieting'
            ],
            'Entertainment': [
                'Behind the Scenes Secrets',
                'What You Missed This Week',
                'Top Trending Stories',
                'The Most Surprising Moments',
                'Viral Trends Explained'
            ],
            'General': [
                'Things You Didnt Know About',
                'The Internet Is Shocked',
                'Wait Until You See This',
                'This Went Viral for a Reason',
                'Everyone Is Talking About This'
            ]
        };
        return topicTemplates[niche] || topicTemplates['General'];
    }
}
exports.TopicScriptService = TopicScriptService;
// Singleton instance
let topicScriptService = null;
function getTopicScriptService() {
    if (!topicScriptService) {
        topicScriptService = new TopicScriptService();
    }
    return topicScriptService;
}
//# sourceMappingURL=topicScriptService.js.map