/**
 * @namespace ifan.ui
 * 有关界面的一些辅助函数
 */
ifan.ui = {
	/**
	 * 使窗体产生阴影
	 * @param {HTMLLoader} [loader] 当前窗的 htmlloader
	 */
	dropshadow: function(loader){
		loader = loader || window.htmlLoader;
		loader.filters = window.runtime.Array(
    		new window.runtime.flash.filters.DropShadowFilter(4, 80, 0, .8, 8, 8)
		);
	},

	/**
	 * 锁窗，不让点击与操作
	 * @param {bool} lock 锁或开
	 */
	lockMainWindow: function(lock){
		$D.get('modal').style.display = lock ? 'block' : 'none';
	},

	/**
	 * 计算 textarea 内容 length，返回给 counter 显示
	 * @param {HTMLElement} textarea textarea 输入框
	 * @param {HTMLElement} counter 显示长度的元素
	 */
	setCounter: function(textarea, counter){
		function evhandler(e){
			if (textarea.value.length > 140){
				textarea.value = textarea.value.substring(0, 140);
				$E.stopEvent(e);
			}
			this.setCounterText(textarea, counter);
		}
		$E.on(textarea, 'keydown', evhandler, this, true);
		$E.on(textarea, 'focus', evhandler, this, true);
		$E.on(textarea, 'paste', function(e) {
			var _this = this;
			setTimeout(function() {
				evhandler.call(_this, e);
			}, 0);
		}, this, true);
	},

	/**
	 * 设置 counter 的字数
	 */
	setCounterText: function(textarea, counter){
		var val = 140 - textarea.value.length;
		val = val < 0 ? 0 : val;
		counter.innerHTML = val;
	},

	/**
	 * 让 textarea 支持 ctrl + enter 执行 fn 函数 
	 * @param {HTMLElement} textarea textarea 输入框
	 * @param {function} fn 执行函数
	 * @param {objcet} [scope] fn 函数内 this 的指向
	 */
	ctrlEnter: function(textarea, fn, scope){
		scope = scope || window;
		var ctrlEnter = new YAHOO.util.KeyListener(textarea, {ctrl:true, keys:[13, 100]}, function(t, a){
			fn.call(scope, a[1]);
		});
		ctrlEnter.enable();
	},

	/**
	 * 显示加载状态
	 */
	loading: function(){
		var counter = $D.get('pt-counter');
		$D.addClass(counter, 'loading');
	},

	/**
	 * 隐藏加载状态
	 */
	teardownLoading: function(){
		var counter = $D.get('pt-counter');
		$D.removeClass(counter, 'loading');
	},

	/**
	 * 恢复窗口的大小与位置状态
	 */
	restoreWindowStatues: function(){
		var size = ifan.prefs.get('window_size'),
			pos = ifan.prefs.get('window_position'),
			h = ifan.prefs.get('postarea_height');
		window.resizeTo(size[0], size[1]);
		window.moveTo(pos[0], pos[1]);
		this.resizePostarea(h);
		this.setupKnob();		// 缩放输入框的把手
		if (!/Linux/i.test(air.Capabilities.os)){
			ifan.ui.dropshadow();
		} else {
			$D.addClass(document.body, 'linux');
		}
	},

	/**
	 * 使发表框可缩放
	 * @param {int} h 需要缩放到的高度
	 */
	resizePostarea: function(h){
		$D.get('postarea').style.height = h + 'px';
		$D.get('msgs').style.bottom = h + 9 + 'px';
	},

	/**
	 * 设置输入框缩放的把手
	 */
	setupKnob: function(){
		var	pt = $D.get('postarea'),
			knob = $D.get('pt-knob'),
			msgs = $D.get('msgs'),
			dd = new ifan.ui.Knob(knob, pt, msgs);
	},

	_curShowPanel: null,

	/**
	 * 显示 panel 
	 * @param {ifan.ui.ModalPanel} panel 模态 panel 对象
	 * @param {function} callback 显示以后执行的函数
	 * @param {bool} lockWindow 是否锁窗
	 * @param {object} [scope] callback 函数执行时 this 的指向
	 */
	showPanel: function(panel, lockWindow){
		if (this._curShowPanel){
			if (this._curShowPanel == panel) return;
			this._curShowPanel.hide();
		}
		panel.show(lockWindow);
		this._curShowPanel = panel;
	},

	/**
	 * 隐藏 panel
	 * @param {ifan.ui.ModalPanel} panel 模态 panel 对象
	 * @param {function} callback 隐藏以后执行的函数
	 * @param {object} [scope] callback 函数执行时 this 的指向
	 */
	hidePanel: function(panel){
		panel.hide();
		this._curShowPanel = null;
	},

	focusInTextarea: function(textarea){
		textarea.select();
		window.getSelection().collapseToEnd(); // 跳到后面去
		setTimeout(function(){
			textarea.focus();
		}, 0);
	}
}

/**
 * @namespace ifan.ui.ModalPanel
 * 模态 panel
 * @panel {string | HTMLElement} el 需要生成 panel 的元素
 */
ifan.ui.ModalPanel = function(el){
	if (isStr(el)) el = document.getElementById(el);
	this.el = el;
	this.innerEl = this.el.getElementsByClassName('panel-inner')[0];
	this.el.style.top = 0 - this.el.offsetHeight + 'px';
	this.onShow = new $CE('show', this);
	this.onHide = new $CE('hide', this);
}

/** @namespace ifan.ui.ModalPanel.prototype */
ifan.ui.ModalPanel.prototype = {
	_curAnim: null,

	/**
	 * 切换动画
	 */
	_toggle: function(el, isShow){
		var h = el.offsetHeight,
			t = 0-h,
			fr = parseInt($D.getStyle(el, 'top')),
			prop = isShow ? {top:{from:fr, to:20}} : {top:{from:fr, to:t}},
			a = 'panel-hide',
			b = 'panel-show';
		
		var anim = new $A(el, prop, .7, isShow ? $AE.easeIn : $AE.easeOut);
		if (this._curAnim) this._curAnim.stop();
		if (isShow){
			this.el.style.top = t + 'px';
			anim.onStart.subscribe(function(t, a){
				$D.replaceClass(el, a, b);
			});
		} else {
			this.el.style.top = '12px';
			anim.onComplete.subscribe(function(t, a){
				$D.replaceClass(el, b, a);
			});
		}
		anim.onStart.subscribe(function(){
			this._curAnim = anim;
		}, this, true);
		anim.onComplete.subscribe(function(){
			this._curAnim = null;
			if (isShow) this.onShow.fire();
			else this.onHide.fire();
		}, this, true);
		anim.animate();
	},

	/**
	 * 显示 panel
	 * @panel {bool} lockWindow 是否锁窗
	 */
	show: function(lockWindow){
		this._toggle(this.el, true);
		ifan.ui.lockMainWindow(lockWindow);
	},

	/**
	 * 隐藏 panel
	 */
	hide: function(){
		this._toggle(this.el, false);
		ifan.ui.lockMainWindow(false);
	}
}

/**
 * @namespace ifan.ui.Knob
 * 参数列表参见 YAHOO.util.DD
 */
ifan.ui.Knob = function(id, elPostarea, elMsgs){
	ifan.ui.Knob.superclass.constructor.call(this, id);
	this.postarea = elPostarea;
	this.msgsarea = elMsgs;
}

/** @namespace ifan.ui.Knob.prototype */
YAHOO.lang.extend(ifan.ui.Knob, YAHOO.util.DD, {
	startDrag: function(x, y){
		this.clickY = y;
		this.kHeight = parseInt($D.getStyle(this.postarea, 'height'));
	},

	onDrag: function(e){
		var y = $E.getPageY(e),
			delta = this.clickY - y,
			el = this.getEl(),
			kHeight = this.kHeight + delta;
		el.style.top = '0';
		el.style.left = '0';
		if (kHeight < 27 || y < 128) return;
		this.postarea.style.height = kHeight + 'px';
		this.msgsarea.style.bottom = kHeight + 9 + 'px';
	},

	endDrag: function(e){
		// 结束缩放后记住当前状态
		ifan.prefs.set('postarea_height', this.postarea.offsetHeight);
	}
});
