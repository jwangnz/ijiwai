/** @namespace ifan.app */
ifan.app = {
	/**
	 * app 的初始化
	 */
	init: function(){
		ifan.prefs.load();
		this.setupCustomWindow();
		this.setupProps();
		ifan.ui.restoreWindowStatues();
		ifan.updater.init();
		this.setupPanles();
		if (!ifan.prefs.get('passrem')){
			ifan.util.fortune();
			ifan.ui.showPanel(this.panels['login'], false);
		}
		ifan.msg.init();
		this.setupLogin();
		//air.Introspector.Console.log(ifan.updater.getVersion());
	},

	/**
	 * 退出 app
	 */
	exit: function(){
		$E.removeListener(air.NativeApplication.nativeApplication, air.Event.EXITING, this._exitCall, this, true);
		this._exitCall();
		air.NativeApplication.nativeApplication.exit();
	},

	/**
	 * app 退出时执行
	 */
	_exitCall: function(e){
		var nw = window.nativeWindow;
		$E.removeListener(nw, air.Event.CLOSING, this._closeCall, this, true);
		ifan.prefs.set('window_size', [nw.width, nw.height]);
		ifan.prefs.set('window_position', [nw.x, nw.y]);
		ifan.prefs.save();
		ifan.msg.notification.dealloc();
		ifan.msg.menu.dealloc();
	},

	_closeCall: function(e){
		e && $E.stopEvent(e);
		window.nativeWindow.visible = false;
	},

	/**
	 * 配置自定义窗口
	 */
	setupCustomWindow: function(){
		var nw = window.nativeWindow;
		nw.title = APPNAME;
		$E.on('w-minimize', 'click', function(e){
			$E.stopEvent(e);
			nw.minimize();
		});
		$E.on('w-close', 'click', function(e){
			$E.stopEvent(e);
			nw.visible = false;
		});
		$E.on('w-resize', 'mousedown', function(e){
			$E.stopEvent(e);
			nw.startResize(air.NativeWindowResize.BOTTOM_RIGHT);
		});
		$E.on('hd', 'mousedown', function(e){
			nw.startMove();
		});
		$E.on(nw, air.Event.ACTIVATE, function(e){
			$D.removeClass(document.body, 'w-activate');
		});
		$E.on(nw, air.Event.DEACTIVATE, function(e){
			if (ifan.prefs.get('window_transparent_on_deactive')){
				$D.removeClass(document.body, 'w-deactivate');
			}
			// if (ifan.util.os.linux) return; // linux has a bug here
			// setTimeout(function(){
			// 	ifan.msg.menu.hide();
			// }, 0);
		})
		if(air.NativeApplication.supportsSystemTrayIcon) {
			this.setupSystemIcon();
		} else if (air.NativeApplication.supportsDockIcon){// for mac os x
			this.setupDock();
		}
		if (ifan.util.os.win){ // 调整按钮顺序以符合 windows 操作习惯
			this.reverseButtons();
		}
		if (ifan.util.os.mac){	// 把关闭放左边，符合 mac 习惯
			$D.addClass('hd', 'mac');
			$D.insertAfter('w-minimize', 'w-close');
		}
		$E.on(air.NativeApplication.nativeApplication, air.Event.EXITING, this._exitCall, this, true);
		$E.on(nw, air.Event.CLOSING, this._closeCall, this, true);
	},
	
	setupPanles: function(){
		this.panels = {
			'login': null,
			'prefs': null,
			'dmsg': null,
			'msgdel': null
		};
		for (var key in this.panels){
			this.panels[key] = new ifan.ui.ModalPanel(key+'-panel');
		}	
		this.setupPrefsPanel();
		this.setupDmsgPanel();
		this.setupMsgdelPanel();
	},

	setupPrefsPanel: function(){
		var tab = $D.get('pp-tab'),
			cur = tab.getElementsByTagName('b')[0];
		$E.on(tab, 'click', function(e){
			$E.stopEvent(e);
			var t = $E.getTarget(e),
				nn = t.nodeName.toLowerCase();
			if (nn != 'b' || t == cur) return;
			$D.removeClass(cur, 'current');
			$D.get(cur.id.replace(/^ppt/, 'ppc')).style.display = 'none';
			cur = t;
			$D.addClass(cur, 'current');
			$D.get(cur.id.replace(/^ppt/, 'ppc')).style.display = 'block';
		});

		this.setVersion();		// 设置关于里的版本号
		this.loadPrefsToPanel(); // 把偏好设置的数据加载进 panel 中
	},

	loadPrefsToPanel: function(){
		var cnt = $D.get('pp-content'),
			selects = cnt.getElementsByTagName('select'),
			checkboxes = $D.getElementsBy(function(el){return el.type == 'checkbox'}, 'input', cnt),
			_this = this;
		$D.batch(selects, function(el){
			var key = getKey(el),
				val = ifan.prefs.get(key);
			setSelected(el, val);
			$E.on(el, 'change', function(e){
				ifan.prefs.set(key, getSelectedVal(el));
			});
			if (key == 'update_interval'){
				$E.on(el, 'change', function(e){
					ifan.msg.updateLoop();
				});
			} 
		});
		
		$D.batch(checkboxes, function(el){
			var key = getKey(el);
			el.checked = ifan.prefs.get(key);
			$E.on(el, 'change', function(e){
				ifan.prefs.set(key, el.checked);
			});
			if (key == 'start_at_login'){ // must run in runtime
				$E.on(el, 'change', function(e){
					try {					// avoid adl fail
						air.NativeApplication.nativeApplication.startAtLogin = ifan.prefs.get('start_at_login');
					} catch(e){}
				});
			} else if (key == 'accept_notificaiton') {
				$E.on(el, 'change', function(e){
					// items[0] 是 notifiaction 隐藏框，如果顺序有边请记得更新
					air.NativeApplication.nativeApplication.icon.menu.items[0].checked = !this.checked;
				});
			}
		});

		function getKey(el){
			return el.id.replace(/^option-/, '');
		}

		function setSelected(select, val){
			for (var i=0, opts = select.options, n=opts.length; i<n; ++i){
				if (opts[i].value == val) opts[i].selected = true;
			}
		}

		function getSelectedVal(select){
			return select.options[select.selectedIndex].value;
		}
	},

	setVersion: function(){
		$D.get('ifan-version').innerHTML = ifan.updater.getVersion();
	},

	setupDmsgPanel: function(){
		var frm = $D.get('dmsg-form');
		ifan.ui.ctrlEnter(frm['text'], ifan.msg._postDMsg, ifan.msg);
		ifan.ui.setCounter(frm['text'], $D.get('dmsg-counter'));
		$E.on(frm, 'submit', function(e){
			ifan.msg._postDMsg(e);
		}, ifan.msg, true);
		$E.on('dmsg-fail-resend', 'click', function(e){
			$D.get('dmsg-fail-result').style.display = 'none';
			$D.get('dmsg-edit').style.display = 'block';
		});
	},

	setupMsgdelPanel: function(){
		var p = this.panels['msgdel'];
		$E.on(p.el, 'click', function(e){
			var t = $E.getTarget(e);
			if ($D.hasClass(t, 'msgdel-hide')){
				p.hide();
			} else if ($D.hasClass(t, 'msgdel-del')){
				var sid = t.getAttribute('status_id');
				var type = t.getAttribute('msg_type');
				ifan.msg.del(type, sid, {
					success: function(o){
						p.innerEl.innerHTML = '<p>成功删除消息。</p><p class="act"><button id="msgdel-succ" class="msgdel-hide">关闭</button></p>';
						$D.get('msgdel-succ').focus();
						var el = $D.get(sid),
							anim = new $CA(el, {opacity:{to:0}}, 1, $AE.easeOut);
						el.style.backgroundColor = '#fff999';
						el.style.borderColor = '#ffcc00';
						anim.onStart.subscribe(function(){
							p.hide();
						});
						anim.onComplete.subscribe(function(){
							el.parentNode.removeChild(el);
						});
						anim.animate();
					},
					failure: function(o){
						p.innerEl.innerHTML = '<p class="error">消息删除失败。原因：' + (o.responseText || '未知') + '。</p><p class="act"><button id="msgdel-fail-close" class="msgdel-hide">关闭</button> <button id="msgdel-fail-retry" status_id="' + sid + '" class="msgdel-del">重试</button></p>';
						$D.get('msgdel-fail-retry').focus();
						if (ifan.util.os.win){
							$D.insertAfter('msgdel-fail-retry', 'msgdel-fail-close')
						}
					}
				}, this);
			}
		}, this, true);
	},
	
	showLoginPanel: function(errmsg){
		ifan.msg.stopLoop();
		ifan.util.fortune();
		ifan.ui.showPanel(this.panels['login'], true);
		var elErr = $D.get('login-error');
		if (errmsg){
			elErr.style.display = '';
			elErr.innerHTML = errmsg;
		} else {
			elErr.style.display = 'none';
		}
		$D.get('login').style.display = 'block';
		$D.get('content').style.display = 'none';
		$D.get('msgs').innerHTML = '';

		// 重设环境
		ifan.msg.resetEnv();
	},

	showPrefsPanel: function(){
		ifan.ui.showPanel(this.panels['prefs'], true);
	},

	hidePrefsPanel: function(){
		ifan.ui.hidePanel(this.panels['prefs']);
		ifan.prefs.save();
		if (!this._isLogined){
			this.showLoginPanel();
		}
	},

	setupLogin: function(){
		var frm = $D.get('login-form'),
			usr = frm['username'],
			pwd = frm['password'],
			pwdrem = frm['passrem'],
			storedUser = ifan.prefs.getEnc('username'),
			storedPass = ifan.prefs.getEnc('password');
		
		usr.value = storedUser;
		pwd.value = storedPass;
		pwdrem.checked = ifan.prefs.get('passrem');
		
		if (pwdrem.checked){
			if (ifan.prefs.get('host') == 'twitter.com'){
				ifan.msg.setTwitterEnv();
				this._is_twitter = true;
			} else {
				ifan.msg.setFanfouEnv();
				this._is_twitter = false;
			}
			this.resetURLs();
			this.verify(storedUser, storedPass);
		} else {
			setTimeout(function(){
				if (!usr.value){
					usr.focus();
				} else {
					pwd.focus();
				}
			}, 0);
		}
		
		$E.on(frm, 'submit', function(e){
			$E.stopEvent(e);
			if (!usr.value || !pwd.value) return;
			var username = usr.value,
				password = pwd.value;
			if (this._is_twitter_reg.test(username)){
				this._is_twitter = true;
				username = username.replace(this._is_twitter_reg, '');
			} else {
				this._is_twitter = false;
			}
			ifan.prefs.setEnc('username', username);
			ifan.prefs.setEnc('password', password);
			ifan.prefs.set('passrem', pwdrem.checked);
			if (this._is_twitter){
				var host = 'http://twitter.com';
				var api_host = 'http://twitter.com';
				ifan.msg.setTwitterEnv();
			} else {
				var host = 'http://jiwai.de';
				var api_host = 'http://api.jiwai.de';
				this.resetURLs();
				ifan.msg.setFanfouEnv();
			}
			ifan.prefs.set('host', host);
			ifan.prefs.set('api_host', api_host);
			this.resetURLs();
			ifan.msg.resetEnv();
			this.verify(username, password);
		}, this, true);
	},

	resetURLs: function(){
		HOST = ifan.prefs.get('host');
		API_HOST = ifan.prefs.get('api_host');
		//HOST = 'http://devel.com';
		//API_HOST = 'http://api.devel.com';
		CREDENTIAL_URL = API_HOST + '/account/verify_credentials.json';
		FRIEND_TIMELINE = API_HOST + '/statuses/friends_timeline.json?format=html';
		REPLIES_TIMELINE = API_HOST + '/statuses/replies.json?format=html';
		DIRECT_MESSAGES = API_HOST + '/direct_messages.json';
		DIRECT_MESSAGE_NEW = API_HOST + '/direct_messages/new.json';
		DIRECT_MESSAGE_DESTROY = API_HOST + '/direct_messages/destroy/';
		UPDATE_URL = API_HOST + '/statuses/update.json';
		USERINFO_URL = API_HOST + '/users/show.json?id=';
		STATUS_DESTROY = API_HOST + '/statuses/destroy/';
		
		ifan.msg._update_urls = {
			'f': FRIEND_TIMELINE,
			'd': DIRECT_MESSAGES,
			'r': REPLIES_TIMELINE
		};
	},

	verify: function(name, pass){
		ifan.ui.hidePanel(this.panels['login']);
		$C.resetDefaultHeaders();
		$C.initHeader('Authorization', 'Basic ' + Base64.encode(name + ':' + pass));
		var async = $C.asyncRequest('GET', CREDENTIAL_URL, {
			success: function(o){
				$C.initHeader('Authorization', 'Basic ' + Base64.encode(name + ':' + pass), true);
				ifan.prefs.save();
				ifan.prefs.encrypt('username');
				if ($D.get('passrem').checked){
					ifan.prefs.encrypt('password');
				} else {
					ifan.prefs.encrypt('password', '');
				}
				if (this._is_twitter){
					this._loadMsgs(ifan.prefs.getEnc('username'));
				} else {
					this.getUserInfo(name, function(){
						this._loadMsgs(this.userinfo['screen_name']);
					}, this);
				}
			},
			failure: function(o){
				this.showLoginPanel(LOGIN_ERROR);
				this._isLogined = false;
			},
			timeout: 30000,
			scope: this
		});
		if ($C.isCallInProgress(async)){
			$D.get('login-slogan').innerHTML = '正在获取消息，请稍候...';
		}
	},

	_loadMsgs: function(name){
		$D.get('login').style.display = 'none';
		$D.get('msgs').innerHTML = '';
		window.nativeWindow.title = APPNAME + ' - ' + name;
		this.loadMsgs();
	},

	setupDock: function(){
		var loader = new air.Loader();
		$E.on(loader.contentLoaderInfo, air.Event.COMPLETE, function(e){
			air.NativeApplication.nativeApplication.icon.bitmaps = new runtime.Array(e.target.content.bitmapData);
		}, this, true);
		loader.load(new air.URLRequest('img/jicon-128.png'));
		air.NativeApplication.nativeApplication.icon.menu = this.createSystemTrayiconMenu(true);
		$E.on(air.NativeApplication.nativeApplication, air.InvokeEvent.INVOKE, function(e){
			this.showWindow();
			ifan.msg.menu.hide();
		}, this, true);
		
	},

	setupSystemIcon: function(){
		air.NativeApplication.nativeApplication.icon.tooltip = APPNAME;
		var systrayIconLoader = new air.Loader();
		$E.on(systrayIconLoader.contentLoaderInfo, air.Event.COMPLETE, function(e){
			air.NativeApplication.nativeApplication.icon.bitmaps = new runtime.Array(e.target.content.bitmapData);
		});
		systrayIconLoader.load(new air.URLRequest('img/jicon-16.png'));
		$E.on(air.NativeApplication.nativeApplication.icon, 'click', function(e){
			if (window.nativeWindow.visible){
				window.nativeWindow.visible = false;
				if (ifan.util.os.linux) ifan.msg.menu.hide();
			} else {
				this.showWindow();
			}
		}, this, true);
		air.NativeApplication.nativeApplication.icon.menu = this.createSystemTrayiconMenu();
	},

	createSystemTrayiconMenu: function(isDock){
		var menu = new air.NativeMenu(),
			pause = new air.NativeMenuItem('隐藏消息提示框'),
			logout = new air.NativeMenuItem('注销'),
			prefs = new air.NativeMenuItem('设置');
		
		logout.name = 'logout';
		logout.enabled = false;
		
		pause.checked = !ifan.prefs.get('accept_notificaiton');
		$E.on(pause, air.Event.SELECT, function(e){
			pause.checked = !pause.checked;
			ifan.prefs.set('accept_notificaiton', !pause.checked);
			$D.get('option-accept_notificaiton').checked = !pause.checked;
		});

		$E.on(logout, air.Event.SELECT, function(e){
			this.logout();
		}, this, true);

		$E.on(prefs, air.Event.SELECT, function(e){
			this.showWindow();
			this.showPrefsPanel();
		}, this, true);
		
		menu.addItem(pause);
		menu.addItem(prefs);
		menu.addItem(logout);

		if (!isDock){
			var segline = new air.NativeMenuItem('', true),
				exit = new air.NativeMenuItem('退出');
			$E.on(exit, air.Event.SELECT, function(e) {
				this.exit();
			}, this, true);
			menu.addItem(segline);
			menu.addItem(exit);
		}
		
		return menu;
	},

	reverseButtons: function(){
		var buttons = [
			['dmsg-cancel', 'dmsg-ok'],
			['dmsg-fail-close', 'dmsg-fail-resend'],
			['msgdel-cancel', 'msgdel-ok']
		];
			
		for (var i=0; i<buttons.length; i++){
			$D.insertAfter(buttons[i][0], buttons[i][1]);
		}
	},

	showWindow: function(){		// 在 mac 下，如果 visible 是 false, 无法通过 cmd+tab 呼出程序，但可通过点击 dock icon 出现(invoke event 的作用)。寻找解决方案中
		window.nativeWindow.visible = true;
		window.nativeWindow.restore();
		window.nativeWindow.activate();
		window.nativeWindow.orderToFront();
		if (air.NativeApplication) {
			air.NativeApplication.nativeApplication.activate(window.nativeWindow);
		}
	},

	getUserInfo: function(userid, callback, sco){
		$C.asyncRequest('GET', USERINFO_URL + userid, {
			success: function(o){
				try {
					this.userinfo = eval('(' + o.responseText + ')');
				} catch(e){
					this.showLoginPanel(LOGIN_ERROR);
					this.userinfo = null;
				}
				if (this.userinfo){
					callback && callback.call(sco || window);
				}
			},
			failure: function(o){
				this.showLoginPanel(LOGIN_ERROR);
				this._isLogined = false;
			},
			timeout: 30000,
			scope: this
		});
	},

	logout: function(){
		this._isLogined = false;
		this.showLoginPanel();
		$D.get('login-error').style.display = 'none';
		this.showWindow();
		window.nativeWindow.title = APPNAME;
		var logoutItem = air.NativeApplication.nativeApplication.icon.menu.getItemByName('logout');
		logoutItem.enabled = false;
	},

	loadMsgs: function(){
		this._isLogined = true;
		var logout = air.NativeApplication.nativeApplication.icon.menu.getItemByName('logout');
		logout.enabled = true;
		var _this = this;
		ifan.msg.updateMsgs();
		if (ifan.prefs.get('check_update_at_appstart')
			&& !this._update_checked){
			this._update_timer = setTimeout(function(){
				ifan.updater.check();
				_this._update_checked = true;
			}, 300000);
		}
	},
	
	setupProps: function(){
		window.htmlLoader.manageCookies = false;
		window.htmlLoader.paintsDefaultBackground = false;
		window.htmlLoader.cacheResponse = true;
		window.htmlLoader.useCache = true;
		window.htmlLoader.authenticate = false;
		window.htmlLoader.navigateInSystemBrowser = true;
		air.URLRequestDefaults.manageCookies = false;
		air.URLRequestDefaults.cacheResponse = true;
		air.URLRequestDefaults.useCache = true;
		var app = air.NativeApplication.nativeApplication;
		app.autoExit = true;
		try {					// avoid adl fail
			app.startAtLogin = ifan.prefs.get('start_at_login');
		} catch(e){}
	},

	gotoHome: function(){
		ifan.util.openURLInbrowser(HOST+'/wo/');
	},

	userinfo: {},
	_is_twitter_reg: /^\$ttt\$/,
	_is_twitter: false
}
