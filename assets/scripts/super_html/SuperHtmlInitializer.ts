import super_html from './super_html_playable';
import { _decorator, Component, Sprite, tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * SuperHtmlInitializer wires Super HTML playable integration.
 */
@ccclass('SuperHtmlInitializer')
export class SuperHtmlInitializer extends Component {

    start() {
        super_html.set_app_store_url("");
        super_html.set_google_play_url("");
    } 

    public Download() : void
       {
        super_html.download();
    }
}

export default new SuperHtmlInitializer();