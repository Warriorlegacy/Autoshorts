"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicService = void 0;
exports.getMusicService = getMusicService;
class MusicService {
    constructor() {
        this.apiKey = process.env.PIXABAY_API_KEY || '';
        this.baseUrl = 'https://pixabay.com/api';
        this.musicDir = 'public/music';
        // Ensure music directory exists
        const fs = require('fs');
        if (!fs.existsSync(this.musicDir)) {
            fs.mkdirSync(this.musicDir, { recursive: true });
        }
    }
    isAvailable() {
        return !!this.apiKey;
    }
    /**
     * Search for royalty-free music
     */
    async searchMusic(options) {
        try {
            const params = new URLSearchParams({
                key: this.apiKey,
                q: options.query || 'background music',
                category: 'music',
                per_page: String(options.limit || 20),
            });
            // Add filters
            if (options.mood) {
                params.append('mood', options.mood);
            }
            const response = await fetch(`${this.baseUrl}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Pixabay API error: ${response.status}`);
            }
            const data = await response.json();
            return data.hits.map((hit) => ({
                id: hit.id,
                title: hit.tags?.split(',')[0] || 'Untitled',
                artist: 'Royalty-Free Artist',
                genre: hit.tags?.split(',')[1]?.trim() || 'Background',
                mood: this.detectMood(hit.duration, hit.bpm),
                tempo: hit.bpm ? (hit.bpm > 120 ? 'fast' : hit.bpm > 80 ? 'medium' : 'slow') : 'medium',
                duration: hit.duration || 180,
                previewUrl: hit.previewURL,
                downloadUrl: hit.audioURL,
                thumbnailUrl: hit.imageURL || hit.artworkURL || '🎵',
            }));
        }
        catch (error) {
            console.error('Music search error:', error.message);
            return this.getDefaultMusic();
        }
    }
    /**
     * Get music by genre
     */
    async getMusicByGenre(genre, limit = 10) {
        return this.searchMusic({
            query: genre,
            limit,
        });
    }
    /**
     * Get music by mood
     */
    async getMusicByMood(mood, limit = 10) {
        const moodMapping = {
            happy: 'upbeat positive',
            sad: 'melancholic emotional',
            energetic: 'action dynamic',
            calm: 'relaxing ambient',
            dramatic: 'cinematic orchestral',
        };
        return this.searchMusic({
            query: moodMapping[mood] || mood,
            mood: mood,
            limit,
        });
    }
    /**
     * Get trending/popular music
     */
    async getTrendingMusic(limit = 10) {
        return this.searchMusic({
            query: 'viral trending background music',
            limit,
        });
    }
    /**
     * Download music to local storage
     */
    async downloadMusic(track) {
        try {
            const https = require('https');
            const fs = require('fs');
            const path = require('path');
            const filename = `music_${track.id}_${Date.now()}.mp3`;
            const filepath = path.join(this.musicDir, filename);
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filepath);
                https.get(track.downloadUrl, (response) => {
                    if (response.statusCode !== 200) {
                        file.close();
                        fs.unlink(filepath, () => { });
                        reject(new Error(`Download failed: ${response.statusCode}`));
                        return;
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Music downloaded: ${filename}`);
                        resolve(`/music/${filename}`);
                    });
                }).on('error', (err) => {
                    file.close();
                    fs.unlink(filepath, () => { });
                    reject(err);
                });
            });
        }
        catch (error) {
            console.error('Download error:', error.message);
            return null;
        }
    }
    /**
     * Get music categories/genres
     */
    getMusicGenres() {
        return [
            { id: 'all', name: 'All Genres', icon: '🎵' },
            { id: 'electronic', name: 'Electronic', icon: '🎛️' },
            { id: 'hip-hop', name: 'Hip Hop', icon: '🎧' },
            { id: 'rock', name: 'Rock', icon: '🎸' },
            { id: 'pop', name: 'Pop', icon: '🎤' },
            { id: 'classical', name: 'Classical', icon: '🎻' },
            { id: 'jazz', name: 'Jazz', icon: '🎷' },
            { id: 'ambient', name: 'Ambient', icon: '🌙' },
            { id: 'cinematic', name: 'Cinematic', icon: '🎬' },
            { id: 'acoustic', name: 'Acoustic', icon: '🎸' },
        ];
    }
    /**
     * Get music moods
     */
    getMusicMoods() {
        return [
            { id: 'happy', name: 'Happy', icon: '😊' },
            { id: 'energetic', name: 'Energetic', icon: '⚡' },
            { id: 'calm', name: 'Calm', icon: '😌' },
            { id: 'sad', name: 'Sad', icon: '😢' },
            { id: 'dramatic', name: 'Dramatic', icon: '🎭' },
            { id: 'mysterious', name: 'Mysterious', icon: '🔮' },
            { id: 'romantic', name: 'Romantic', icon: '💕' },
            { id: 'motivational', name: 'Motivational', icon: '🚀' },
        ];
    }
    /**
     * Detect mood from duration and BPM
     */
    detectMood(duration, bpm) {
        if (bpm) {
            if (bpm > 140)
                return 'energetic';
            if (bpm > 110)
                return 'upbeat';
            if (bpm > 80)
                return 'moderate';
            return 'calm';
        }
        // Fallback based on duration
        if (duration < 60)
            return 'short';
        if (duration < 180)
            return 'medium';
        return 'long';
    }
    /**
     * Get default music tracks when API is unavailable
     */
    getDefaultMusic() {
        return [
            {
                id: 1,
                title: 'Upbeat Corporate',
                artist: 'Free Music Archive',
                genre: 'Corporate',
                mood: 'energetic',
                tempo: 'fast',
                duration: 180,
                previewUrl: '',
                downloadUrl: '',
                thumbnailUrl: '🎵',
            },
            {
                id: 2,
                title: 'Ambient Dreams',
                artist: 'Royalty-Free',
                genre: 'Ambient',
                mood: 'calm',
                tempo: 'slow',
                duration: 240,
                previewUrl: '',
                downloadUrl: '',
                thumbnailUrl: '🌙',
            },
            {
                id: 3,
                title: 'Cinematic Journey',
                artist: 'Film Score',
                genre: 'Cinematic',
                mood: 'dramatic',
                tempo: 'medium',
                duration: 300,
                previewUrl: '',
                downloadUrl: '',
                thumbnailUrl: '🎬',
            },
            {
                id: 4,
                title: 'Happy Morning',
                artist: 'Pop Sound',
                genre: 'Pop',
                mood: 'happy',
                tempo: 'fast',
                duration: 150,
                previewUrl: '',
                downloadUrl: '',
                thumbnailUrl: '☀️',
            },
            {
                id: 5,
                title: 'Tech Innovation',
                artist: 'Electronic Studio',
                genre: 'Electronic',
                mood: 'energetic',
                tempo: 'fast',
                duration: 200,
                previewUrl: '',
                downloadUrl: '',
                thumbnailUrl: '🤖',
            },
        ];
    }
}
exports.MusicService = MusicService;
// Singleton instance
let musicService = null;
function getMusicService() {
    if (!musicService) {
        musicService = new MusicService();
    }
    return musicService;
}
//# sourceMappingURL=musicService.js.map