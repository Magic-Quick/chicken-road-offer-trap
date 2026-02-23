import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Label } from 'cc';
import { message } from './message';
const { ccclass, property } = _decorator;

@ccclass('Chat')
export class Chat extends Component {
    @property(Node)
    messageContainer: Node = null;

    @property(Prefab)
    messagePrefab: Prefab = null;

    @property({
        tooltip: 'Scroll animation duration in seconds'
    })
    scrollDuration: number = 0.5;

    @property({
        tooltip: 'Wait time between scrolls in seconds'
    })
    waitTime: number = 2.0;

    @property
    moveDistance: number = 80;

    @property(Label)
    onlineText: Label = null;

    private isScrolling: boolean = false;
    private currentOnline: number = 14000; // Initial online value
    private readonly MIN_ONLINE: number = 13000;
    private readonly MAX_ONLINE: number = 15000;
    private readonly MAX_CHANGE: number = 500;

    @property
    spacing: number = 80;

    private messageNodes: Node[] = [];
    private messageTexts: string[] = [
        "SpinMaster_777: LET'S GOOOOO!!! 🐔🔥",
        "xX_B0r1s_Xx: Chicken Road, guys! This is\ngoing to be epic! 💥",
        "OlgaSlots: This slot is always on fire!\nLet's do 50 spins! 💸💸",
        "Turbo_Pushka: Who else is playing Chicken\nRoad? Let me know! 👀",
        "LuckyBacon: Wow, I just hit x300 in 3\nspins! 🔥🔥",
        "MrBanHammer: Guys, watch out for caps! 🛑",
        "CrazyIvan1991: Hey everyone, I'm on\nChicken Road — ready for a big win! 🤑",
        "ZVEROBAS: Got 100 here, hoping for a\nbonus! 🤞",
        "Papich_Slot: Oh yeah! My favorite slot!",
        "Gulnara777: It can pay big, just wait\nfor the right moment! 🙏",
        "x_SlotKiller_x: Where are the bonuses?!",
        "Borisik228: Let's go! Chicken Road never\ndisappoints! 💪",
        "DarkoStavka: Can't stop, give me 20 more\nspins! 🔥",
        "MashaMasha: Gonna hit x500 now! 🎯💸",
        "Turbo_Gambler: Let's roll! Chicken Road,\ngive me something big! 💰",
        "BanHammer_22: Finally! Got a bonus! 🔥🎰",
        "PapichSlot: Not bad at all! 🐔💰",
        "LuckyBacon: WHAT WAS THAT?!\nx1000 on the last spin! 😱",
        "SpinMaster_777: WAIT A MINUTE! GIVE ME\nANOTHER SPIN! 🤑",
        "OlgaSlots: Wow, this is insane! 🎉",
        "Turbo_Pushka: Chicken Road is popping\nagain! Everything's working! 💥",
        "ZVEROBAS: x1000 incoming — I'm on top!",
        "CrazyIvan1991: Already up 500, all from\nChicken Road! 🔥",
        "x_SlotKiller_x: I can throw in 100 more!",
        "Borisik228: Yes! I'm in profit now! 🏆",
        "MashaMasha: The chickens are flying!",
        "SpinMaster_777: Nice! Chicken Road came\nthrough! 🎉"
    ];
    private currentMessageIndex: number = 0;

    onLoad() {
        this.spawnMessages();
    }

    start() {
        this.scheduleScrollCycle();
        this.scheduleOnlineUpdate();
    }

    private spawnMessages(): void {
        if (!this.messageContainer || !this.messagePrefab) {
            return;
        }

        for (let i = 0; i < this.messageTexts.length; i++) {
            const messageNode = instantiate(this.messagePrefab);
            const messageComponent = messageNode.getComponent(message);
            
            if (messageComponent) {
                const textIndex = this.currentMessageIndex % this.messageTexts.length;
                messageComponent.setMessageText(this.messageTexts[textIndex]);
                this.currentMessageIndex++;
            }

            // Position messages downward with spacing interval
            messageNode.setPosition(new Vec3(0, -i * this.spacing, 0));
            
            this.messageContainer.addChild(messageNode);
            this.messageNodes.push(messageNode);
        }
    }

    private scheduleScrollCycle(): void {
        // Wait before next cycle
        this.scheduleOnce(() => {
            this.moveMessagesUp();
        }, this.waitTime);
    }

    private moveMessagesUp(): void {
        if (this.messageNodes.length === 0 || this.isScrolling) return;

        this.isScrolling = true;

        // Completed tweens counter
        let completedTweens = 0;
        const totalTweens = this.messageNodes.length;

        // Animate all messages upward by moveDistance
        this.messageNodes.forEach((node) => {
            const currentPos = node.getPosition();
            const targetPos = new Vec3(currentPos.x, currentPos.y + this.moveDistance, currentPos.z);
            
            tween(node)
                .to(this.scrollDuration, { position: targetPos })
                .call(() => {
                    completedTweens++;
                    // When all tweens complete
                    if (completedTweens === totalTweens) {
                        this.recycleTopMessage();
                        this.isScrolling = false;
                        // Schedule the next scroll cycle
                        this.scheduleScrollCycle();
                    }
                })
                .start();
        });
    }

    private recycleTopMessage(): void {
        if (this.messageNodes.length === 0) return;

        // Find top-most message (max Y)
        let topMessageNode: Node = null;
        let maxY = -Infinity;

        this.messageNodes.forEach((node) => {
            const pos = node.getPosition();
            if (pos.y > maxY) {
                maxY = pos.y;
                topMessageNode = node;
            }
        });

        if (!topMessageNode) return;

        // Find bottom-most message (min Y)
        let minY = Infinity;
        this.messageNodes.forEach((node) => {
            const pos = node.getPosition();
            if (pos.y < minY) {
                minY = pos.y;
            }
        });

        // Place it spacing below the bottom-most message
        const newY = minY - this.spacing;
        topMessageNode.setPosition(new Vec3(0, newY, 0));

        // Update message text
        const messageComponent = topMessageNode.getComponent(message);
        if (messageComponent) {
            const textIndex = this.currentMessageIndex % this.messageTexts.length;
            messageComponent.setMessageText(this.messageTexts[textIndex]);
            this.currentMessageIndex++;
        }
    }

    private scheduleOnlineUpdate(): void {
        // Update online count immediately at start
        this.updateOnline();
        
        // Schedule next update in a random interval between 1 and 3 seconds
        const randomInterval = 1 + Math.random() * 2; // 1–3 seconds
        this.scheduleOnce(() => {
            this.scheduleOnlineUpdate();
        }, randomInterval);
    }

    private updateOnline(): void {
        if (!this.onlineText) return;

        // Generate random change in [-MAX_CHANGE, +MAX_CHANGE]
        const change = Math.floor(Math.random() * (this.MAX_CHANGE * 2 + 1)) - this.MAX_CHANGE;
        
        // Apply change and clamp to range
        this.currentOnline += change;
        this.currentOnline = Math.max(this.MIN_ONLINE, Math.min(this.MAX_ONLINE, this.currentOnline));

        // Update label text
        this.onlineText.string = `Online: ${this.currentOnline}`;
    }
}