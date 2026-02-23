import { _decorator, Component, Node, AudioSource } from 'cc';
import { AudioController } from './audio-controller';
import { AudioCatalog } from './audio-catalog';
import { GlobalEventBus } from '../common/event-bus';

const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property(AudioCatalog)
    public audioCatalog: AudioCatalog = null!;

    @property(Node)
    public sfxParentNode: Node = null!;

    @property(AudioSource)
    public musicAudioSource: AudioSource = null!;

    private audioController: AudioController | null = null;

    onLoad() {
        if (!this.audioCatalog || !this.sfxParentNode || !this.musicAudioSource) return;

        this.audioController = new AudioController({
            bus: GlobalEventBus,
            catalog: this.audioCatalog,
            audioSourceParent: this.sfxParentNode,
            musicAudioSource: this.musicAudioSource
        });

        this.audioController.start();
    }

    onDestroy() {
        if (this.audioController) {
            this.audioController.stop();
            this.audioController = null;
        }
    }

    public enableAudio(): void {
        if (this.audioController) {
            this.audioController.enableAudio();
        }
    }

    public disableAudio(): void {
        if (this.audioController) {
            this.audioController.disableAudio();
        }
    }

    public isAudioEnabled(): boolean {
        return this.audioController ? this.audioController.isAudioEnabled() : false;
    }
}

