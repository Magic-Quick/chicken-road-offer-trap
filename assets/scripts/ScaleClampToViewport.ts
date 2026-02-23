import { _decorator, Component, Node, UITransform, Canvas, view, Vec3, find } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/**
 * ScaleClampToViewport
 * Component that scales a node down horizontally only when its bounds exceed the visible Canvas area.
 * When there is space again, it restores the original scale.
 * Intended for UI nodes under `Canvas` (Screen Space).
 */
@ccclass('ScaleClampToViewport')
@executeInEditMode(true)
@requireComponent(UITransform)
export class ScaleClampToViewport extends Component {

	@property({ tooltip: 'Optional target node. If not set, uses this.node.' })
	targetNode: Node | null = null;

	@property({ tooltip: 'Left/right margin (Canvas UI units) the object must fit within.' })
	margin: number = 0;

	@property({ tooltip: 'Allow expanding back to original scale when there is room.' })
	enableExpandBack: boolean = true;

	@property({ tooltip: 'Ignore node transform events (useful with FollowCameraX)' })
	ignoreTransformEvents: boolean = false;

	private _canvasTransform: UITransform | null = null;
	private _originalWorldScale: Vec3 | null = null;
	private _boundUI: UITransform | null = null;
	private _lastCanvasPixelWidth: number = -1;
	private _lastCanvasWidth: number = -1;
	private _isUpdating: boolean = false;
	private static readonly _EPSILON = 1e-4;
	private _updateCounter: number = 0;
	private _initialPositionInCanvas: Vec3 | null = null;

		onEnable() {
		this._cacheRefs();
		this._ensureOriginalScale();
		this._bindNodeChangeEvents(true);
			// Subscribe to canvas/design resolution changes
		view.on('canvas-resize', this._updateScale, this);
		view.on('design-resolution-changed', this._updateScale, this);
			// Frame size changed (window resize / DPR changes)
		(view as any).on && (view as any).on('frame-size-changed', this._updateScale, this);
			// Web fallback: listen to window.resize when available
		if (typeof window !== 'undefined' && window.addEventListener) {
			window.addEventListener('resize', this._updateScale as any, { passive: true });
		}
		this._updateScale();
	}

	onDisable() {
		this._bindNodeChangeEvents(false);
		view.off('canvas-resize', this._updateScale, this);
		view.off('design-resolution-changed', this._updateScale, this);
		(view as any).off && (view as any).off('frame-size-changed', this._updateScale, this);
		if (typeof window !== 'undefined' && window.removeEventListener) {
			window.removeEventListener('resize', this._updateScale as any);
		}
	}

	private _cacheRefs() {
		const canvasNode = this._findCanvasNode();
		this._canvasTransform = canvasNode ? canvasNode.getComponent(UITransform) : null;
		const node = this.targetNode ?? this.node;
		this._boundUI = node.getComponent(UITransform);
	}

	private _ensureOriginalScale() {
		const node = this.targetNode ?? this.node;
		if (!this._originalWorldScale) {
			this._originalWorldScale = node.worldScale.clone();
		}
		
		// Save initial position in Canvas for ignoreTransformEvents mode
		if (this.ignoreTransformEvents && !this._initialPositionInCanvas && this._canvasTransform) {
			this._initialPositionInCanvas = this._canvasTransform.convertToNodeSpaceAR(node.worldPosition);
		}
	}

	private _findCanvasNode(): Node | null {
		// First, look for a parent Canvas
		let p: Node | null = this.node;
		while (p) {
			if (p.getComponent(Canvas)) return p;
			p = p.parent;
		}
		// If none are parents — try to find globally
		const canvas = find('Canvas');
		return canvas ?? null;
	}

	private _bindNodeChangeEvents(bind: boolean) {
		const target = this.targetNode ?? this.node;
		const method = bind ? 'on' : 'off';
		// React to size changes
		(target as any)[method]?.(Node.EventType.SIZE_CHANGED, this._updateScale, this);
		// React to transforms only if not ignoring them
		if (!this.ignoreTransformEvents) {
			(target as any)[method]?.(Node.EventType.TRANSFORM_CHANGED, this._updateScale, this);
		}
	}

	private _updateScale = () => {
		if (this._isUpdating) return;
		this._isUpdating = true;
		try {
		if (!this._canvasTransform || !this._boundUI) {
			this._cacheRefs();
		}
		if (!this._canvasTransform || !this._boundUI) return;

		const canvasPixelWidth = view.getFrameSize().width;
		const canvasWidth = this._canvasTransform.width;
		
		// Track changes both in pixels and in UI units
		const pixelChanged = canvasPixelWidth !== this._lastCanvasPixelWidth;
		const uiChanged = canvasWidth !== this._lastCanvasWidth;
		
		if (pixelChanged) {
			this._lastCanvasPixelWidth = canvasPixelWidth;
		}
		if (uiChanged) {
			this._lastCanvasWidth = canvasWidth;
		}

		const canvasHalfWidth = this._canvasTransform.width * 0.5 - this.margin;
		if (canvasHalfWidth <= 0) return;

		const target = this.targetNode ?? this.node;
		const contentWidth = this._boundUI.width;
		if (contentWidth <= 0) return;

		// Node center position in Canvas coordinate space
		let centerInCanvas: Vec3;
		if (this.ignoreTransformEvents && this._initialPositionInCanvas) {
			// Use saved initial position for objects with FollowCameraX
			centerInCanvas = this._initialPositionInCanvas;
		} else {
			// Use current position for regular objects
			centerInCanvas = this._canvasTransform.convertToNodeSpaceAR(target.worldPosition);
		}
		const absCenterX = Math.abs(centerInCanvas.x);

		// Use stored original world scale
		const original = this._originalWorldScale;
		if (!original) return;

		// Check if the object fits at ORIGINAL size
		const originalWorldHalfWidth = (contentWidth * original.x) * 0.5;
		const extentWithOriginal = absCenterX + originalWorldHalfWidth;

		if (extentWithOriginal <= canvasHalfWidth) {
			// Fits with original size — restore
			if (this.enableExpandBack) {
				const ws = target.worldScale;
				if (Math.abs(ws.x - original.x) > ScaleClampToViewport._EPSILON ||
					Math.abs(ws.y - original.y) > ScaleClampToViewport._EPSILON ||
					Math.abs(ws.z - original.z) > ScaleClampToViewport._EPSILON) {
					target.setWorldScale(original);
				}
			}
			return;
		}

		// Doesn't fit — scale down
		// Required half-size in Canvas to fit
		const allowedHalfWidth = Math.max(0, canvasHalfWidth - absCenterX);
		// Desired WORLD scale on X
		let desiredWorldScaleX = (2 * allowedHalfWidth) / contentWidth;
		// Never exceed original
		desiredWorldScaleX = Math.min(desiredWorldScaleX, original.x);
		// Uniform scale
		const uniform = Math.max(0, desiredWorldScaleX);
		const ws = target.worldScale;
		if (Math.abs(ws.x - uniform) > ScaleClampToViewport._EPSILON ||
			Math.abs(ws.y - uniform) > ScaleClampToViewport._EPSILON ||
			Math.abs(ws.z - uniform) > ScaleClampToViewport._EPSILON) {
			target.setWorldScale(uniform, uniform, uniform);
		}
		} finally {
			this._isUpdating = false;
		}
	};

	public forceUpdate(): void {
		this._updateScale();
	}

	update() {
		// More reliable change detection for preview mode
		this._updateCounter++;
		
		// Check every few frames for performance
		if (this._updateCounter % 3 === 0) {
			const currentPixelWidth = view.getFrameSize().width;
			const currentCanvasWidth = this._canvasTransform?.width ?? 0;
			
			const pixelChanged = currentPixelWidth !== this._lastCanvasPixelWidth;
			const canvasChanged = currentCanvasWidth !== this._lastCanvasWidth;
			
			if (pixelChanged || canvasChanged) {
				this._lastCanvasPixelWidth = currentPixelWidth;
				this._lastCanvasWidth = currentCanvasWidth;
				this._updateScale();
			}
		}
	}
}

export default ScaleClampToViewport;


