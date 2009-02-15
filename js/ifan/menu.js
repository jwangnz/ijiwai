/**
 * 操作按钮的菜单
 */
ifan.Menu = function(){
	var options = new air.NativeWindowInitOptions();
	options.transparent = true;
	options.type = air.NativeWindowType.LIGHTWEIGHT;
	options.systemChrome = air.NativeWindowSystemChrome.NONE;
	options.resizable = false;
	options.minimizable = false;
	options.maximizable = false;
	var width = ifan.util.os.linux ? 202 : 220;
	var bounds = new air.Rectangle(
		/* left */ 0,
		/* top */ 0,
		/* width */ width,
		/* height */ 0
	);
	this.loader = air.HTMLLoader.createRootWindow( 
		false, //hidden 
		options, 
		false, //no scrollbars
		bounds
	);
	this.loader.placeLoadStringContentInApplicationSandbox = true;
	this.loader.paintsDefaultBackground = false;
	this.loader.loadString('<html><head><meta name="Content-Type" content="text/html; charset=UTF-8" /><link rel="stylesheet" href="app:/style.css" type="text/css" media="screen" /></head><body id="actions-menu"><div id="actions-dialog">\
			<ul>\
				<li id="reply">回复这条消息</li>\
				<li id="dmsg">发送悄悄话</li>\
				<li class="sep"></li>\
				<li id="clearall">清空消息列表</li>\
				<li class="sep"></li>\
				<!--li id="share">分享这条消息</li-->\
				<li id="rt">转帖这条消息</li>\
				<li id="del">删除这条消息</li>\
				<li id="browse">浏览这条消息</li>\
				<li class="sep"></li>\
				<li id="refresh">刷新</li>\
				<li id="logout">注销</li>\
				<li class="sep"></li>\
				<li id="goprofile">浏览用户的叽歪主页</li>\
			</ul>\
		</div></body></html>');

	$E.on(this.loader, air.Event.COMPLETE, function(e){
		if (!ifan.util.os.linux){ // flash can not drop shadow at linux platform
			ifan.ui.dropshadow(this.loader);
		} else {
			$D.addClass(this.loader.window.document.body, 'linux');
		}
		var nw = this.loader.stage.nativeWindow;
		nw.height = this._get('actions-menu').offsetHeight;
		this.actionEls = [];
		var lis = this._get('actions-dialog').getElementsByTagName('li');
		for (var i=0; i<lis.length; i++){
			if (lis[i].id) this.actionEls.push(lis[i]);
		}
		this.handleClick();
		this.handleHover();
	}, this, true);
}

ifan.Menu.prototype = {
	/**
	 * 显示菜单
	 * @param {object} event 鼠标的点击事件
	 * @param {function} fn 显示时执行的函数
	 */
	show: function(event, attr, fn){
		var ldr = this.loader,
			nw = ldr.stage.nativeWindow,
			bounds = air.Screen.mainScreen.visibleBounds,
			scrX = event.screenX,
			scrY = event.screenY;
		if (scrX + nw.width > bounds.right){
			scrX = bounds.right - nw.width - 10;
		}
		if (scrY + nw.height > bounds.bottom){
			scrY -= nw.height;
		}
		nw.x = scrX;
		nw.y = scrY;
		nw.visible = true;
		nw.orderToFront();
		this.actionDescription = attr;
		this.handleShow();
		if (this.curItem) $D.removeClass(this.curItem);
		fn && fn();
	},

	/**
	 * 隐藏菜单
	 * @param {function} 隐藏时执行的函数
	 */
	hide: function(fn){
		var nw = this.loader.stage.nativeWindow;
		nw.visible = false;
		if (ifan.msg._curActbtn){
			$D.removeClass(ifan.msg._curActbtn, 'active');
			ifan.msg._curActbtn = null;
		}
		fn && fn();
	},

	isShow: function(){
		return this.loader.stage.nativeWindow.visible;
	},

	handleShow: function(){
		var d = this.actionDescription,
			items = this._disbaledItems[d['type']],
			
		for (var i=0; i<this.actionEls.length; i++){
			var li = this.actionEls[i];
			if (items[li.id]){
				$D.addClass(li, 'disabled');
			} else {
				$D.removeClass(li, 'disabled');
			}
		}
		if (d['type'] == 'dmsg'){
			this._get('dmsg').innerHTML = '回复悄悄话';
		} else {
			this._get('dmsg').innerHTML = '发送悄悄话';
		}
	},
	
	handleClick: function(){
		var _this = this;
		$E.on(this.actionEls, 'click', function(e){
			$E.stopEvent(e);
			if (_this._isDisabled(this)) return;
			_this.actionFns[this.id].call(_this);
			_this.hide();
			window.nativeWindow.activate();
		});
	},

	_isDisabled: function(el){
		return $D.hasClass(el, 'disabled');
	},

	handleHover: function(){	// 不使用 CSS 的 hover 是因为鼠标移动过快时无法把 hover 状态清除
		var _this = this,
			els = this.actionEls;
		$E.on(els, 'mouseover', function(e){
			if (_this.curItem) $D.removeClass(_this.curItem, 'hover');
			if (_this._isDisabled(this)) return;
			_this.curItem = this;
			$D.addClass(_this.curItem, 'hover');
		});

		$E.on(els, 'mouseout', function(e){
			if (_this._isDisabled(this)) return;
			if (_this.curItem) $D.removeClass(_this.curItem, 'hover');
			_this.curItem = null;
		});

		$E.on(this.loader.stage, air.Event.MOUSE_LEAVE, function(e){
			if (_this.curItem) $D.removeClass(_this.curItem, 'hover');
		});
	},

	actionFns: {
		'reply': function(){
			var d = this.actionDescription;
			ifan.msg.reply(d['to_uname'], d['msgid']);
		},

		'dmsg': function(){
			var d = this.actionDescription;
			var msg_id = d['msgid'];
			if (d['type'] != 'dmsg') msg_id = '';
			ifan.msg.dmsg(d['to_uname'], d['to_uid'], msg_id);
		},

		'rt': function(){
			var li = $D.get(this.actionDescription['msgid']),
				author = li.getElementsByTagName('h2')[0].innerText,
				content = li.getElementsByClassName('msg')[0].innerText,
				textarea = $D.get('postform')['status'];
			textarea.value = '转自@' + author + ': ' + content;
			ifan.ui.focusInTextarea(textarea);
		},

		'del': function(){
			var p = ifan.app.panels['msgdel'];
			p.innerEl.innerHTML = '<p>确定删除这条消息吗？</p><p class="act"><button id="msgdel-cancel" class="msgdel-hide">取消</button> <button id="msgdel-del" class="msgdel-del" msg_type="' + this.actionDescription['type']+'" status_id="' + this.actionDescription['msgid'] + '">删除</button></p>';
			if (ifan.util.os.win){
				$D.insertAfter('msgdel-cancel', 'msgdel-del');
			}
			setTimeout(function(){
				$D.get('msgdel-cancel').focus();
			}, 10);
			p.show(true);
		},

		'browse': function(){
			var statusURL = this.actionDescription['to_profile'] + 'statuses/';
			if (this.actionDescription['type'] == 'dmsg') {
				statusURL = HOST + '/wo/direct_messages/reply/';
			}
			ifan.util.openURLInbrowser(statusURL+this.actionDescription['msgid']);
		},

		'clearall': function(){
			$D.get('msgs').innerHTML = '';
 		},

		'refresh': function(){
			ifan.msg.updateLoop(true);
		},

		'logout': function(){
			ifan.app.logout();
		},

		'goprofile': function(){
			profile = this.actionDescription['to_profile'];
			ifan.util.openURLInbrowser(profile);
		}
	},

	_get: function(id){			// yui's Dom.get don't cross window
		return this.loader.window.document.getElementById(id);
	},

	_disbaledItems: {
		'self': {'reply':true, 'dmsg':true},
		'else': {'del':true},
		'dmsg': {'reply':true, 'share':true,}
	},

	/**
	 * 清理内存
	 */
	dealloc: function(){
        if(this.loader){
			this.loader.stage.nativeWindow.close();
			this.loader = null;
		}   	
	}
}
