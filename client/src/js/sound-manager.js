import { Howl, Howler } from 'howler';

export class SoundManager {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        
        this.init();
    }

    init() {
        //> background ambient
        this.sounds.forest = new Howl({
            src: ['https://assets.mixkit.co/sfx/preview/mixkit-forest-wind-and-birds-1223.mp3'], // cap
            loop: true,
            volume: 0.4,
            html5: true
        });

        //> short whisper
        this.sounds.whisper = new Howl({
            src: ['https://assets.mixkit.co/sfx/preview/mixkit-human-male-breath-shout-2041.mp3'], // cap
            volume: 0.6
        });

        //> Pop sound
        this.sounds.pop = new Howl({
            src: ['https://assets.mixkit.co/sfx/preview/mixkit-plastic-bubble-click-1124.mp3'], // cap
            volume: 0.5
        });
    }

    playAmbient() {
        if (!this.sounds.forest.playing()) {
            this.sounds.forest.play();
        }
    }

    playWhisper() {
        this.sounds.whisper.play();
    }

    playPop() {
        this.sounds.pop.play();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        Howler.mute(this.isMuted);
        return this.isMuted;
    }
}
