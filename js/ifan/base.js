
var ifan = ifan || {};

// global shortcuts of yui
var $A = YAHOO.util.Anim,
	$AE = YAHOO.util.Easing,
	$CA = YAHOO.util.ColorAnim,
	$C = YAHOO.util.Connect,
	$CE = YAHOO.util.CustomEvent,
	$D = YAHOO.util.Dom,
	$E = YAHOO.util.Event,
	JSON = YAHOO.lang.JSON,
	isStr = YAHOO.lang.isString;

$C.initHeader('Cookie', '', true); // set Connection with no cookie

var APPNAME = '爱叽歪',
	PREFS_FILE = 'prefs.json',
	TEXTAREA_TIP = '你在干嘛呢~输入消息，回车发送';
	LOGIN_ERROR = '用户/密码错误，或网络超时，请重新登录';

// overwrite YAHOO.util.Anim.prototype.setAttribute to get loader.alpha work properly
$A.prototype.setAttribute = function(attr, val, unit) {
    if ( this.patterns.noNegatives.test(attr) ) {
        val = (val > 0) ? val : 0;
    }
	if (this.getEl().hasOwnProperty('style')){
		YAHOO.util.Dom.setStyle(this.getEl(), attr, val + unit);
	} else {
		this.getEl()[attr] = val + unit;
	}
};
