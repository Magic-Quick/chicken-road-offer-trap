import { _decorator, Component, Node, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('message')
export class message extends Component {
    @property(Label)
    messageText: Label = null;
    
    setMessageText(text: string): void {
        if (this.messageText) {
            this.messageText.string = text;
        }
    }
}


