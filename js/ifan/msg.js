ifan.msg = {
	init: function(){
		this._wrapper = $D.get('msgs');
		this.notification = new ifan.Notification();
		this.menu = new ifan.Menu();
		this.bindTextareaEvent();
		this.clickOnMsgs();
		this.hoverOnMsgs();
		function hideMenu(e){
			this.menu.hide();
		}
		$E.on(air.NativeApplication.nativeApplication, air.Event.DEACTIVATE, hideMenu, this, true);
		$E.on(window, 'mousedown', hideMenu, this, true);
		$E.on(window, 'scroll', hideMenu, this, true);
		$E.on($D.get('postform')['status'], 'focus', hideMenu, this, true);
		if (ifan.util.os.win){	// alt + tab
			$E.on(window, 'keydown', function(e){
				if(e.altKey){
					hideMenu.call(this, e);
				}
			}, this, true);
		}
		if (ifan.util.os.linux){ // alt + tab
			$E.on(window.nativeWindow, air.Event.ACTIVATE, function(e){
				if (this.menu.isShow()) this.menu.loader.window.nativeWindow.orderToFront();
			}, this, true);
		}
	},

	_update_urls: {			// will append user id when login successful
		'f': null,
		'd': null,
		'r': null
	},

	_timer: null, 				// update loop timer

	_firstLoad: true,
	// f - friend timeline d - direct message r - replies
	_req_statuses: {				// 0 unresponse 1 success 2 failure
		'f': 0, 
		'd': 0,
		'r': 0
	},

	_req_response: {
		'f': null,
		'd': null,
		'r': null
	},

	_since_id: {
		'f': null,
		'd': null,
		'r': null
	},

	_async: {
		'f': null,
		'd': null,
		'r': null
	},

	_regReply: /@([^\s^@]+)\s/g,

	resetEnv: function(){
		for (var k in this._req_statuses){
			this._req_statuses[k] = 0;
			this._req_response[k] = null;
			this._since_id[k] = null;
			this._async[k] = null;
		}
		this._firstLoad = true;
	},

	setFanfouEnv: function(site){
		this._d_url_field = 'sender_screen_name';
		this._d_name_field = 'sender_screen_name';
		this._url_field = 'screen_name';
		this._name_field = 'screen_name';
		this._reply_to_name_field = 'recipient_id';
		this._cmp = this._cmp_fanfou;
		this._isSelf = this._isSelf_fanfou;
		this.dmsg = this.dmsg_fanfou; 
	},

	setTwitterEnv: function(){
		this._d_url_field = 'sender_screen_name';
		this._d_name_field = 'sender_screen_name';
		this._url_field = 'screen_name';
		this._name_field = 'screen_name';
		this._reply_to_name_field = 'in_reply_to_screen_name';
		this._cmp = this._cmp_twitter;
		this._isSelf = this._isSelf_twitter;
		this.dmsg = this.dmsg_twitter;
	},

	_cmp_fanfou: function(item){
		return item['text'].indexOf('@' + ifan.app.userinfo['screen_name']) == 0;
	},

	_cmp_twitter: function(item){
		return item['in_reply_to_screen_name'] == ifan.prefs.getEnc('username');
	},

	_isSelf_fanfou: function(item, userkey){
		userkey = userkey || 'user';
		if (userkey == 'sender') return item['sender_screen_name'] == ifan.app.userinfo['screen_name'];
		return item[userkey]['id'] == ifan.app.userinfo['id'];
	},

	_isSelf_twitter: function(item, userkey){
		userkey = userkey || 'user';
		return item[userkey]['screen_name'] == ifan.prefs.getEnc('username');
	},

	updateLoop: function(instant){
		var _this = this,
			interval = ifan.prefs.get('update_interval');
		this.stopLoop();
		if (instant){
			this.updateMsgs();
		}
		if (interval == 0) return;
		this._timer = setTimeout(function(){
			_this.updateMsgs();
		}, interval);
	},
	
	stopLoop: function(){
		if (this._timer) clearTimeout(this._timer);
	},
	
	updateTimeMeter: function(){
		var dts = this._wrapper.getElementsByClassName('dt');
		for (var i=0; i<dts.length; i++){
			var dtp = dts[i].getAttribute('dt');
			dts[i].innerHTML = ifan.util.timeMeter(parseInt(dtp));
		}
	},

	updateMsgs: function(){
		var urls = this._update_urls,
			since_id = this._since_id,
			statuses = this._req_statuses,
			rand = Math.random();
		for (var k in urls){
			(function(key){
				var url = urls[key];
				url += (url.indexOf('?') != -1 ? '&' : '?') + rand;
				if (since_id[key]){
					url += '&since_id=' + this._since_id[key];
				} else {
					if (key == 'f'){
						url += '&count=20';
					} else {
						url += '&count=10';
					}
				}
				if (this._async[key] && $C.isCallInProgress(this._async[key])){
					$C.abort(this._async[key]);
				}
				this._async[key] = $C.asyncRequest('GET', url, {
					success: function(o){
						this._handleSuccess(o, key);
					},
					failure: function(o){
						this._handleFailure(o, key);
					},
					timeout: 60000,
					scope: this
				});
				
				if ($C.isCallInProgress(this._async[key])){
					ifan.ui.loading();
				}
			}).call(this, k);
		}
	},

	_handleSuccess: function(o, key){
		try {
			var res = eval('(' + o.responseText + ')');
		} catch(e){
			var res = [];
		}
		this._req_response[key] = res;
		if (res.length){
			this._since_id[key] = res[0]['id'];
		}
		this._req_statuses[key] = 1;
		this._loadMsg();
	},

	_handleFailure: function(o, key){
		this._req_statuses[key] = 2;
		this._req_response[key] = [];
		if (this._handle401(o)) return;
		this._loadMsg();
	},

	_handle401: function(o){
		if (o.status == 401){
			errmsg = '出错了：你的用户/密码已变更；或者需要填写验证码，请先在网页上登录叽歪，然后重新登录爱叽歪';
			ifan.app.showLoginPanel(errmsg);
			ifan.app._isLogined = false;
			ifan.app.showWindow();
			return true;
		}
		return false;
	},

	_hasLoadedAll: function(){
		for (var key in this._req_statuses){
			if (this._req_statuses[key] == 0)
				return false;
		}
		return true;
	},

	_loadMsg: function(){
		if (!this._hasLoadedAll()) return;
		var datas = [];
		for (var key in this._req_response){
			datas = datas.concat(this._req_response[key]);
		}
		var len = datas.length;
		if (this._firstLoad){
			this.runFirstLoad(len);
			this._firstLoad = false;
		}
		if (len){
			this._showMsgs(datas);
		} else {
			this.updateTimeMeter();
		}
		ifan.ui.teardownLoading();
		this.updateLoop();
		for (var key in this._req_statuses){ // restore status
			this._req_statuses[key] = 0;
		}
	},

	_showMsgs: function(datas){
		datas = this._uniq(datas);
		datas = this._sortData(datas);

		var lis = this._wrapper.getElementsByTagName('li'),
			n = lis.length,
			curLi = null,
			initFirst = true;
		if (n > 0){
			var curEl = lis[0];
			initFirst = false;
		}
		
		for (var i=0; i<datas.length; i++){
			var cur = datas[i];
			var li = document.createElement('li');
			li.id = cur['id'];
			if (cur['sender_id']){ // so this is direct msg
				li.innerHTML =  this._genMsg_direct(cur);
				$D.addClass(li, 'msg-direct');
			} else {
				li.innerHTML = this._genMsg(cur);
				if (this._cmp(cur)){
					$D.addClass(li, 'msg-user');
				}
			}
			if (curEl){
				$D.insertBefore(li, curEl);
			} else {
				this._wrapper.appendChild(li);
				var nomsgTip = $D.get('nomsg-tip');
				nomsgTip && nomsgTip.parentNode.removeChild(nomsgTip);
			}
			curEl = li;
		}
		if (!initFirst){
			this.showNotification(datas);
		} else {
			this._wrapper.scrollTop = 0;
		}
		this.updateTimeMeter();
	},

	runFirstLoad: function(nomessage){
		var cnt = $D.get('content');
		cnt.style.display = 'block';
		cnt.style.opacity = 0;
		if (nomessage){
			var p = document.createElement('p');
			p.setAttribute('id', 'nomsg-tip');
			p.innerHTML = '你没有发布或收到任何消息，<br />在下方的输入框马上发布一条试试看 :)';
			$D.insertAfter(p, 'msgs');
		}
		var anim = new $A(cnt, {opacity:{from:0, to:1}}, 1, $AE.easeInStrong);
		anim.animate();
	},

	_mkUserURL: function(item, img){
		return ['<a class="outlink" target="_blank" href="', item['user']['profile_url'], '">', img || item['user'][this._name_field], '</a>'].join('');
	},

	_mkUserURL_direct: function(item){
		return ['<a class="outlink" target="_blank" href="', item['sender_profile_url'], '">', item[this._d_name_field], '</a>'].join('');
	},

	_genMsg_direct: function(item){
		var ret = [],
			msg = this._escapeMsg(item['text']);
		ret.push('<h2>');
		ret.push(this._mkUserURL_direct(item));
		ret.push('</h2><p><span class="msg">');
		ret.push(msg);
		ret.push('</span>');
		ret.push('<a class="dt outlink" dt="');
		ret.push(Date.parse(item['created_at']));
		ret.push('" href="');
		ret.push(HOST + '/wo/direct_messages/reply/');
		ret.push(item['id']);
		ret.push('" target="_blank">');
		ret.push(ifan.util.timeMeter(item['created_at']));
		ret.push('</a>');
		ret.push('</p>');
		ret.push('<div class="actions" type="dmsg" to_uname="');
		ret.push(item[this._d_name_field]);
		ret.push('" to_profile="');
		ret.push(item['sender_profile_url']);
		ret.push('" to_uid="');
		ret.push(item['sender_id']);
		ret.push('"><b class="all"></b></div>');
		return ret.join('');
	},

	_genMsg: function(item){
		var ret = [],
			statusURL =  item['user']['profile_url'] + 'statuses/';
		msg = this._escapeReply(item['text']);
		ret.push(this._mkUserURL(item, '<img src="' + item['user']['profile_image_url'] + '" />'));
		ret.push('<h2>');
		ret.push(this._mkUserURL(item));
		ret.push('</h2>');
		ret.push('<p><span class="msg">');
		ret.push(msg);
		ret.push('</span>');
		ret.push('<a class="dt outlink" dt="');
		ret.push(Date.parse(item['created_at']));
		ret.push('" href="');
		ret.push(statusURL);
		ret.push(item['id']);
		ret.push('" target="_blank">');
		ret.push(ifan.util.timeMeter(item['created_at']));
		ret.push('</a>');
		if (item['source']){
			ret.push('<span class="via">通过');
			ret.push(item['source']);
			ret.push('</span>');
		}
		ret.push('</p>');
		var type = this._isSelf(item) ? 'self' : 'else';
		ret.push('<div class="actions" type="');
		ret.push(type);
		ret.push('" to_uname="');
		ret.push(item['user'][this._name_field]);
		ret.push('" to_profile="');
		ret.push(item['user']['profile_url']);
		ret.push('" to_uid="');
		ret.push(item['user']['id']);
		ret.push('"><b class="all"></b>');
		if (type != 'self'){
			ret.push('<b class="at"></b>');
		}
		ret.push('</div>');
		return ret.join('');
	},

	_escapeReply: function(msg) {
		msg = ifan.util.replaceURL(msg);
		return ifan.msg.replaceReply(msg);
	},

	replaceReply: function(msg) {
		return msg.replace(ifan.msg._regReply, function($0, $1, $2) {
			return ['@<a class="outlink" targat="_blank" href="', HOST, '/', $1, '/', '">', $1, '</a> '].join('');
		});
	},

	_escapeMsg: function(msg){
		var escape = msg.replace(/</g, '&lt;');
		return ifan.util.replaceURL(escape);
	},

	_sortData: function(data){
		return data.sort(function(a, b){
			return Date.parse(a['created_at']) - Date.parse(b['created_at']);
		});
	},

	_uniq: function(arr){			// 服务器返回的有时不靠谱，前端给检查去除重复
		var ret = [],
			uniq = {};
		for (var i=0; i<arr.length; i++){
			if (!uniq[arr[i]['id']]){
				ret.push(arr[i]);
				uniq[arr[i]['id']] = true;
			}
		}
		return ret;
	},

	_getAttr: function(el){
		var ret = {msgid:null, type:null, to_uid:null, to_uname:null, to_profile:null};
		for (var k in ret){
			if (k == 'msgid'){
				ret[k] = $D.getAncestorByTagName(el, 'li').id;
			} else {
				ret[k] = el.getAttribute(k);
			}
		}
		return ret;
	},

	genNotification: function(arr){
		var ret = [],
			n = arr.length,
			j = 0;
		for (var i=n-1; i>-1; i--){
			var cur = arr[i],
				userkey = cur['sender_id'] ? 'sender' : 'user';
			if (this._isSelf(cur, userkey)) continue;
			ret.push('<li id="');
			ret.push(cur['id']);
			ret.push('"');
			if (cur['sender_id']){
				ret.push(' class="msg-direct">');
				ret.push(this._genMsg_direct(cur));
			} else {
				if (this._cmp(cur)){
					ret.push(' class="msg-user"');
				}
				ret.push('>');
				ret.push(this._genMsg(cur));
			}
			ret.push('</li>');
			j++;
			if (j > 2) break;
		}
		return ret.join('');
	},

	showNotification: function(arr){
		if (!ifan.prefs.get('accept_notificaiton')
			|| window.nativeWindow.active) return;
		var nw = window.nativeWindow;
		nw.notifyUser(air.NotificationType.INFORMATIONAL);
		this.notification.show(this.genNotification(arr), arr.length > 3);
	},

	bindTextareaEvent: function(){
		var frm = $D.get('postform'),
			ta = frm['status'],
			counter = $D.get('pt-counter');

		ifan.ui.setCounter(ta, counter);
		ta.value = TEXTAREA_TIP;
		$E.on(ta, 'keydown', function(e){
			if (e.keyCode == air.Keyboard.ENTER){
				$E.stopEvent(e);
				if ($C.isCallInProgress(this._asyncPOST)) return;
				var val = YAHOO.lang.trim(ta.value);
				if (!val){
					ta.blur();
					counter.innerHTML = '140';
					return;
				}
				this.postMsg(val);
			}
		}, this, true);
		$E.on(ta, 'focus', function(e){
			if (ta.value == TEXTAREA_TIP){
				ta.value = '';
				counter.innerHTML = '140';
			}
		});
		
		$E.on(ta, 'blur', function(e){
			if (!ta.value){
				ta.value = TEXTAREA_TIP;
				counter.innerHTML = '140';
			}
		});
	},

	postMsg: function(msg){
		var frm = $D.get('postform'),
			postarea = frm['status'];
		var postdata = 'status=' + encodeURIComponent(msg) + '&source=iJiWai&idPartner=10050';
		alert(msg);
		alert(encodeURIComponent(msg));
		if (frm['idUserReplyTo']) postdata += '&idUserReplyTo=' + encodeURIComponent(frm['idUserReplyTo'].value);
		if (frm['idStatusReplyTo']) postdata += '&idStatusReplyTo=' + encodeURIComponent(frm['idStatusReplyTo'].value);
		this.stopLoop();
		if (this._asyncPOST && $C.isCallInProgress(this._asyncPOST)) return;
		this._asyncPOST = $C.asyncRequest('POST', UPDATE_URL, {
			success: function(o){
				postarea.value = '';
				this.updateLoop(true);
				postarea.disabled = false;
				ifan.ui.teardownLoading();
			},
			failure: function(o){
				postarea.disabled = false;
				//this.updateLoop();
				ifan.ui.teardownLoading();
				if (this._handle401(o)) return;
				this.updateLoop();
			},
			timeout: 60000,
			scope: this
		}, postdata);

		if ($C.isCallInProgress(this._asyncPOST)){
			ifan.ui.loading();
			postarea.disabled = true;
		}
	},

	reply: function(name, in_reply_to_status_id, is_d){
		var frm = $D.get('postform'),
			postarea = frm['status'],
			prefix = is_d ? 'd ' : '@';
		frm['idStatusReplyTo'].value = in_reply_to_status_id;
		frm['idUserReplyTo'].value = name;
		var v = postarea.value;
		v = v == TEXTAREA_TIP ? '' : v;
		postarea.value = prefix + name + ' ' + v;
		ifan.ui.focusInTextarea(postarea);
	},

	_postDMsg: function(e){
		var frm = $D.get('dmsg-form'); 
		$E.stopEvent(e);
		//$C.setForm(frm);
		var postdata = 'user=' + encodeURIComponent(frm['user'].value) + '&text=' + encodeURIComponent(frm['text'].value) + '&source=iJiWai&idPartner=10050';
		if (frm['idMessageReplyTo']) postdata += '&idMessageReplyTo=' + frm['idMessageReplyTo'].value;
		var async = $C.asyncRequest('POST', DIRECT_MESSAGE_NEW, {
			success: function(o){
				try {
					var res = eval('(' + o.responseText + ')');
				} catch(ex){
					var res = o.responseText;
				}
				if (res['id']){
					frm['user'].value = '';
					frm['text'].value = '';
					frm['idMessageReplyTo'] = '';
					$D.get('dmsg-loading').style.display = 'none';
					$D.get('dmsg-edit').style.display = 'none';
					$D.get('dmsg-succ-result').style.display = 'block';
					$D.get('dmsg-succ-ok').focus();
					setTimeout(function(){
						ifan.ui.hidePanel(ifan.app.panels['dmsg']);
					}, 2000);
				} else {
					handleFailure(res);
				}
			},
			failure: function(o){
				handleFailure();
			},
			timeout: 30000,
			scope: this
		}, postdata);
		if ($C.isCallInProgress(async)){
			$D.get('dmsg-loading').style.display = '';
		}
		function handleFailure(text){
			$D.get('dmsg-loading').style.display = 'none';
			$D.get('dmsg-edit').style.display = 'none';
			var r = $D.get('dmsg-fail-result'),
				p = r.getElementsByTagName('p')[0];
			r.style.display = 'block';
			if (text){
				p.innerHTML = text;
			} else {
				p.innerHTML = '悄悄话发送失败！';
			}
		}
	},

	dmsg_fanfou: function(name, id, msgid){
		var frm = $D.get('dmsg-form');
		frm['user'].value = name;
		frm['idMessageReplyTo'].value = msgid || '';
		$D.get('dmsg-edit').style.display = 'block';
		$D.get('dmsg-loading').style.display = 'none';
		$D.get('dmsg-succ-result').style.display = 'none';
		$D.get('dmsg-fail-result').style.display = 'none';
		$D.get('dmsg-to_uname').innerHTML = name;
		$D.get('dmsg-counter').innerHTML = 140 - frm['text'].value.length;
		var p = ifan.app.panels['dmsg'];
		ifan.ui.showPanel(p, true);
		p.onShow.unsubscribeAll();
		p.onShow.subscribe(function(t, a){
			frm['text'].focus();
		});
	},
	
	dmsg_twitter: function(name){
		this.reply(name, null, true);
	},

	clickOnMsgs: function(){
		this._curActbtn = null;
		
		$E.on('msgs', 'click', function(e){
			var t = e.target,
				nn = t.nodeName.toLowerCase();
			if (nn == 'img'){
				t = t.parentNode;
				nn = t.nodeName.toLowerCase();
			}
			if (nn == 'a'){
				$E.stopEvent(e);
				ifan.util.openURLInbrowser(t.href); // fixed adobe air bug of navigateInSystemBrowser encode url twice
			} else if ($D.hasClass(t, 'at')){
				var li = $D.getAncestorByTagName(t, 'li');
				ifan.msg.reply(t.parentNode.getAttribute('to_uname'), li.id);
				if (!$D.hasClass(li, 'selected')) this.addSelectedClass(li);
			} else if ($D.hasClass(t, 'all')){
				if (this._curActbtn) $D.removeClass(this._curActbtn, 'active');
				this._curActbtn = t;
				this.menu.show(e, this._getAttr(t.parentNode));
				$D.addClass(this._curActbtn, 'active');
				var li = $D.getAncestorByTagName(t, 'li');
				if (!$D.hasClass(li, 'selected')) this.addSelectedClass(li);
			} else if ($D.hasClass(t, 'outlink')){
				$E.stopEvent(e);
				ifan.util.openURLInbrowser(t.href);
			} else {
				var li = nn == 'li' ? t : $D.getAncestorByTagName(t, 'li');
				this.addSelectedClass(li);
				if (this._curActbtn) $D.removeClass(this._curActbtn, 'active');
			}
		}, this, true);
	},

	addSelectedClass: function(li){
		if (!li) return;
		if (this._curLi){
			$D.removeClass(this._curLi, 'selected');
			$D.removeClass(this._curLi, 'hover');
		}
		if (this._curLi == li){
			this._curLi = null;
			return;
		}
		this._curLi = li;
		$D.addClass(this._curLi, 'selected');
	},

	hoverOnMsgs: function(){	// 不使用 CSS 的 hover 功能，因为无法监测到 stage 的 mouseleave 事件
		var curLi;
		$E.on('msgs', 'mouseover', function(e){
			var to = e.target;
			handle(to);
		});

		$E.on('msgs', 'mouseout', function(e){
			var from = e.target;
			handle(from);
			if (curLi){
				$D.removeClass(curLi, 'hover');
				curLi = null;
			}
		});
		
		$E.on(window.nativeWindow.stage, air.Event.MOUSE_LEAVE, function(e){
			if (curLi){
				$D.removeClass(curLi, 'hover');
				curLi = null;
			}
		});

		function handle(t, mouseout){
			var nn = t.nodeName.toLowerCase();
			if (nn != 'li'){
				t = $D.getAncestorByTagName(t, 'li');
				nn = t && t.nodeName.toLowerCase();
			}
			if (curLi) $D.removeClass(curLi, 'hover');
			if (nn != 'li') return;
			if ($D.hasClass(t, 'selected')){
				curLi = null;
				return;
			}
			curLi = t;
			$D.addClass(curLi, 'hover');
		}
	},

	/**
	 * 删除消息
	 */
	del: function(type, id, cb, sco){
		if (this._asyncDel && $C.isCallInProgress(this._asyncDel)){
			$C.abort(this._asyncDel);
		}
		var DESTROY_URL_BASE = STATUS_DESTROY;
		if (type == 'dmsg') DESTROY_URL_BASE = DIRECT_MESSAGE_DESTROY;
		this._asyncDel = $C.asyncRequest('POST', DESTROY_URL_BASE+id+'.json', {
			success: function(o){
				if (o.status == 200){
					cb.success.call(this, o);
				} else{
					cb.failure.call(this, o);
				}
			},
			failure: function(o){
				cb.failure.call(this, o);
			},
			scope: sco || window
		}, ' ');
	},
}
