import { AudioSource, Node, input, Input, game } from 'cc';
import type { IEventBus } from '../common/event-bus';
import type { AudioCatalog } from './audio-catalog';
import { EVT_TAP, EVT_PLAY_SOUND, EVT_PLAY_SOUND_LOOP } from '../common/events';

export class AudioController {
  private readonly bus: IEventBus;
  private readonly catalog: AudioCatalog;
  private readonly sfxAudioSources: AudioSource[] = [];
  private readonly musicAudioSource: AudioSource;
  private readonly audioSourceParent: Node;
  private readonly unsubs: Array<() => void> = [];
  private audioEnabled: boolean = false;

  constructor(params: { bus: IEventBus; catalog: AudioCatalog; audioSourceParent: Node; musicAudioSource: AudioSource }) {
    this.bus = params.bus;
    this.catalog = params.catalog;
    this.audioSourceParent = params.audioSourceParent;
    this.musicAudioSource = params.musicAudioSource;
  }

  public start(): void {
    const tapUnsub = this.bus.subscribe(EVT_TAP, () => this.onFirstTap());
    this.unsubs.push(tapUnsub);

    input.on(Input.EventType.TOUCH_START, this.onDirectTouchStart, this);

    // Native DOM listener on canvas in capture phase.
    // Cocos UI buttons call stopPropagation() on touch events,
    // so the global input.on(TOUCH_START) may not fire when clicking GO.
    // The DOM capture listener intercepts the event BEFORE Cocos UI blocks it.
    this.addNativeTouchListener();

    const soundUnsub = this.bus.subscribe(EVT_PLAY_SOUND, (event: any) => {
      this.playSound(event.soundType, event.volume);
    });
    this.unsubs.push(soundUnsub);

    const soundLoopUnsub = this.bus.subscribe(EVT_PLAY_SOUND_LOOP, (event: any) => {
      this.playSoundLoop(event.soundType, event.volume);
    });
    this.unsubs.push(soundLoopUnsub);
  }

  public stop(): void {
    input.off(Input.EventType.TOUCH_START, this.onDirectTouchStart, this);
    this.removeNativeTouchListener();

    for (const unsub of this.unsubs) {
      try {
        unsub();
      } catch {}
    }
    this.unsubs.length = 0;

    for (const source of this.sfxAudioSources) {
      if (source && source.node) {
        source.node.destroy();
      }
    }
    this.sfxAudioSources.length = 0;
  }

  /** Add native DOM listeners on canvas (capture, once) to reliably catch
   *  the first tap/click even if Cocos UI intercepts it */
  private addNativeTouchListener(): void {
    try {
      const canvas = game.canvas;
      if (canvas) {
        canvas.addEventListener('touchstart', this.onNativeTouchStart, { capture: true, once: true });
        canvas.addEventListener('mousedown', this.onNativeTouchStart, { capture: true, once: true });
      }
    } catch (e) {
      // Fallback: if canvas is unavailable, rely on Cocos input
    }
  }

  /** Remove native DOM listeners (in case stop() happens before first tap) */
  private removeNativeTouchListener(): void {
    try {
      const canvas = game.canvas;
      if (canvas) {
        canvas.removeEventListener('touchstart', this.onNativeTouchStart, { capture: true } as EventListenerOptions);
        canvas.removeEventListener('mousedown', this.onNativeTouchStart, { capture: true } as EventListenerOptions);
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  }

  /** Native handler — fires on ANY tap/click on canvas */
  private onNativeTouchStart = (): void => {
    this.onFirstTap();
  };

  private onDirectTouchStart = (): void => {
    this.onFirstTap();
  };

  private onFirstTap(): void {
    if (!this.audioEnabled) {
      this.audioEnabled = true;
      this.playBackgroundMusic();
    }
  }

  private playBackgroundMusic(): void {
    const musicClip = this.catalog.getBackgroundMusic();
    if (musicClip && this.musicAudioSource) {
      this.musicAudioSource.clip = musicClip;
      this.musicAudioSource.loop = true;
      this.musicAudioSource.volume = 0.4;
      this.musicAudioSource.play();
    }
  }

  private playSound(soundType: string, volume?: number): void {
    if (!this.audioEnabled) return;

    const audioClip = this.catalog.getSoundByType(soundType);
    if (!audioClip) return;

    const audioSource = this.getAvailableAudioSource();
    if (audioSource) {
      // Use 1.0 as default volume if not provided
      const finalVolume = volume !== undefined ? volume : 1.0;
      audioSource.playOneShot(audioClip, finalVolume);
    }
  }

  private playSoundLoop(soundType: string, volume?: number): void {
    if (!this.audioEnabled) return;

    const audioClip = this.catalog.getSoundByType(soundType);
    if (!audioClip) return;

    const audioSource = this.createNewAudioSource();
    if (audioSource) {
      audioSource.clip = audioClip;
      audioSource.loop = true;
      audioSource.volume = volume !== undefined ? volume : 1.0;
      audioSource.play();
    }
  }

  private getAvailableAudioSource(): AudioSource | null {
    for (const source of this.sfxAudioSources) {
      if (!source.playing) {
        return source;
      }
    }
    return this.createNewAudioSource();
  }

  private createNewAudioSource(): AudioSource | null {
    if (!this.audioSourceParent) return null;

    const audioNode = new Node(`SFX_AudioSource_${this.sfxAudioSources.length}`);
    audioNode.setParent(this.audioSourceParent);

    const audioSource = audioNode.addComponent(AudioSource);
    audioSource.loop = false;
    audioSource.playOnAwake = false;
    audioSource.volume = 1.0;

    this.sfxAudioSources.push(audioSource);
    return audioSource;
  }

  public enableAudio(): void {
    this.audioEnabled = true;
  }

  public disableAudio(): void {
    this.audioEnabled = false;
  }

  public isAudioEnabled(): boolean {
    return this.audioEnabled;
  }
}
