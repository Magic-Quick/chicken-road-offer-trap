import { _decorator, Component, AudioClip } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('AudioCatalog')
export class AudioCatalog extends Component {
  @property(AudioClip)
  public balanceScrolling: AudioClip | null = null;

  @property(AudioClip)
  public carDestroy: AudioClip | null = null;

  @property(AudioClip)
  public car: AudioClip | null = null;

  @property(AudioClip)
  public eggTaped: AudioClip | null = null;

  @property(AudioClip)
  public lukeSuccess: AudioClip | null = null;

  @property(AudioClip)
  public buttonClick: AudioClip | null = null;

  @property(AudioClip)
  public winPanel: AudioClip | null = null;

  @property(AudioClip)
  public backgroundMusic: AudioClip | null = null;

  @property(AudioClip)
  public flyBonus: AudioClip | null = null;

  @property(AudioClip)
  public deadChicken: AudioClip | null = null;

  @property(AudioClip)
  public failChicken: AudioClip | null = null;

  public getSoundByType(soundType: string): AudioClip | null {
    switch (soundType) {
      case 'balance_scrolling':
        return this.balanceScrolling;
      case 'car_destroy':
        return this.carDestroy;
      case 'car':
        return this.car;
      case 'egg_taped':
        return this.eggTaped;
      case 'luke_success':
        return this.lukeSuccess;
      case 'button_click':
        return this.buttonClick;
      case 'win_panel':
        return this.winPanel;
      case 'fly_bonus':
        return this.flyBonus;
      case 'dead_chicken':
        return this.deadChicken;
      case 'fail_chicken':
        return this.failChicken;
      default:
        return null;
    }
  }

  public getBackgroundMusic(): AudioClip | null {
    return this.backgroundMusic;
  }
}
