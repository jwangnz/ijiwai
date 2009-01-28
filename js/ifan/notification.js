/**
 * @namespace ifan.Notification
 * 消息通知
 */
ifan.Notification = function(){
	this.width = 280;
	this.height = 54;
}

ifan.Notification.prototype = {

	_timer: null,

	/**
	 * 显示通知
	 * @param {string} message 显示内容
	 */
	show: function(message, showMore){
		if (!message) return;
		this.message = message;
		if (!this.loader){
			this._initLoader(showMore);
		} else {
			this._show(showMore);
		}
	},

	_show: function(showMore){
		var el = this.loader.window.document.getElementById('n-more');
		if (showMore){
			el.style.display = 'block';
		} else {
			el.style.display = '';
		}
		this.injectContent();
		this.fadeIn();
		this.scheduleHide();
	},

	/**
	 * 计划隐藏通知
	 * @param {bool} stop 停止隐藏计划
	 */
	scheduleHide: function(scheduleTime){
		scheduleTime = scheduleTime || ifan.prefs.get('notification_hide_time');
		var _this = this;
		if (this._timer) clearTimeout(this._timer);
		this._timer = setTimeout(function(){
			_this.hide();
		}, scheduleTime);
	},

	stopTimer: function(){
		if (this._timer) clearTimeout(this._timer);
	},

	/**
	 * 隐藏通知
	 */
	hide: function(){
		this.fadeOut();
	},

	/**
	 * 渐显
	 */
	fadeIn: function(){
		var ldr = this.loader,
			anim = new YAHOO.util.Anim(ldr,
				{alpha:{from:0, to:1}, units:''},
				1,
				YAHOO.util.Easing.easeOutStrong);
		anim.onStart.subscribe(function(t, a){
			if (this._curAnim) this._curAnim.stop();
			this._curAnim = anim;
			anim.getEl()['alpha'] = 0;
			ldr.stage.nativeWindow.visible = true;
			ldr.stage.nativeWindow.restore();
		}, this, true);
		anim.onComplete.subscribe(function(t, a){
			this._curAnim = null;
		}, this, true);
		anim.animate();
	},

	/**
	 * 渐隐
	 */
	fadeOut: function(){
		var _this = this,
			ldr = this.loader,
			anim = new YAHOO.util.Anim(ldr,
				{alpha:{from:1, to:0}, units:''},
				0.8,
				YAHOO.util.Easing.easeNode);
		
		anim.onStart.subscribe(function(t, a){
			if (this._curAnim) this._curAnim.stop();
			this._curAnim = anim;
		}, this, true);
		anim.onComplete.subscribe(function(t, a){
			ldr.stage.nativeWindow.visible = false;
			this._curAnim = null;
		}, this, true);
		anim.animate();
	},

	_curAnim: false,

	/**
	 * 插入内容
	 */
	injectContent: function(){
		var win = this.loader.window,
			d = win.document,
			m = d.getElementById('n-message'),
			w = this.loader.stage.nativeWindow,
			bounds = air.Screen.mainScreen.visibleBounds;
		m.innerHTML = this.message;
		w.height = d.getElementById('n-content').clientHeight + 8;
		var right = bounds.right - w.width;
		if (ifan.util.os.mac){
			win.moveTo(right - 8, bounds.top + 8);
		} else { //Dock window to bottom right corner of main screen.
			w.x = right - 10;
			w.y = bounds.bottom - w.height;
		}
	},

	/**
	 * 清理内存
	 */
	dealloc: function(){
        if(this.loader){
			this.loader.stage.nativeWindow.close();
			this.loader = null;
		}   	
	},

	_initLoader: function(showMore){
		var visibleBounds = air.Screen.mainScreen.visibleBounds;
		
		var bounds = new air.Rectangle(
			/* left */ visibleBounds.right - this.width, 
			/* top */ 0,
			/* width */ this.width,
			/* height */ this.height
		);
		
		var options = new air.NativeWindowInitOptions();
		options.transparent = true;
		options.type = air.NativeWindowType.LIGHTWEIGHT;
		options.systemChrome = air.NativeWindowSystemChrome.NONE;
		options.resizable = false;
		options.minimizable = false;
		options.maximizable = false;

		this.loader = air.HTMLLoader.createRootWindow( 
			false, //hidden 
			options, 
			false, //no scrollbars
			bounds
		);
		this.loader.placeLoadStringContentInApplicationSandbox = true;

		this.loader.paintsDefaultBackground = false;
		this.loader.navigateInSystemBrowser = true;
		this.loader.stage.nativeWindow.alwaysInFront = true;

		this.loader.loadString('<html><head><meta name="Content-Type" content="text/html; charset=UTF-8" /><link rel="stylesheet" href="app:/style.css" type="text/css" media="screen" /></head><body id="notiwindow"><div id="n-content"><ul id="n-message"></ul><p id="n-more">更多...</p><span id="n-close">关闭</span></div></body></html>');
	
		function complete(e){
			if (!ifan.util.os.linux){ // flash can not drop shadow at linux platform
				ifan.ui.dropshadow(this.loader);
			} else {
				$D.addClass(this.loader.window.document.body, 'linux');
			}
			this._show(showMore);
			$E.on(this.loader.window, 'unload', function(e){
				this.dealloc();
			}, this, true);
			this.handleHover();
			this.handleClick();
			
			// TODO: 鼠标置于 notification 上，出现关闭按钮并停止 timer
		}
		
		$E.on(this.loader, air.Event.COMPLETE, function(e){
			complete.call(this, e);
		}, this, true);
	},

	handleHover: function(){
		var body = this.loader.window.document.body;
		$E.on(this.loader.stage, air.Event.MOUSE_LEAVE, function(e){
			$D.removeClass(body, 'n-hover');
			this.scheduleHide(2000);
		}, this, true);
		$E.on(body, 'mouseover', function(e){
			$D.addClass(body, 'n-hover');
			this.stopTimer();
		}, this, true);
	},

	handleClick: function(){
		var nw = this.loader.stage.nativeWindow;
		$E.on(this.loader.window.document, 'click', function(e){
			var t = $E.getTarget(e);
			if (t.nodeName.toLowerCase() == 'img') t = t.parentNode;
			if (t.id == 'n-close'){
				if (this._timer) clearTimeout(this._timer);
				this.hide();
			} else {
				ifan.app.showWindow();
				var li, el;
				if (t.nodeName.toLowerCase() == 'li'){
					li = t;
				} else {
					li = $D.getAncestorByTagName(t, 'li');
				}
				if (!li) return;
				el = $D.get(li.id);
				ifan.msg.addSelectedClass(el);
				
				if ($D.hasClass(t, 'outlink')) {
					$E.stopEvent(e);
					ifan.util.openURLInbrowser(t.href);
				} else if ($D.hasClass(t, 'd')){
					$E.stopEvent(e);
					ifan.msg.dmsg(t.getAttribute('to_uname'), t.getAttribute('to_uid'), t.getAttribute('in_reply_to_id'));
					el.scrollIntoView();
					nw.visible = false;
					$D.get('dmsg-form')['text'].focus();
				} else if ($D.hasClass(t, 'at')){
					if (ifan.ui._curShowPanel){
						ifan.ui.hidePanel(ifan.ui._curShowPanel);
					}
					ifan.msg.reply(t.getAttribute('to_uname'));
					el.scrollIntoView();
					nw.visible = false;
					$D.get('postform')['status'].focus();
				}
			}
		}, this, true);
	}
}
