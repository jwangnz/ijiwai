/**@namespace ifan.util */
ifan.util = {
	
	_regURL: /(?:https?:\/\/|www\.)(?:[\w\-]+\.[\w\-\?\.\=\&\+\%\[\]\/#;@:~!]+)/img,
	_regHttp: /^https?:\/\//,

	_fortuneData: [
		/*'锅头饭好吃，过头话难说。',
		'读书如饭，善吃饭者长精神，不善吃者生疾病。',
		'一粥一饭，当思来处不易；半丝半缕，恒念物力维艰。',
		'别人给的饭能饱一天，自己劳动得来的能饱一年。',
		'粗饭养人，粗活益身。',
		'饭疏食、饮水，曲肱而枕之，乐亦在其中矣。不义而富且贵，于我如浮云。',
		'饭前一碗汤，气死好药方。 饭后一支烟，害处大无边。 打人一日忧，骂人三日羞。',
		'对于一个非常饥饿的人，第一餐饭是需要；第二餐饭是满足； 第三餐饭是毒药。',
		'遇事不怒，基本吃素，饭后百步，劳逸适度。',
		'打铁不惜炭，养儿不惜饭。',
		'饭可以一日不吃，觉可以一日不睡，书不可以一日不读。',
		'一饭感恩无地报，此心许国已天知。',
		'衣冷加根带，饭少加碗菜。'*/
		'永不间断、随心所欲、随时随地记录与分享',
	],

	/**
	 * 获取操作系统信息
	 */
	os: (function(){
		var s = air.Capabilities.os;
		return {
			mac: /Mac/i.test(s),
			win: /Windows/i.test(s),
			linux: /Linux/i.test(s)
		}
	})(),
	
	/**
	 * 时间换算器
	 * @param {string | int} time
	 */
	timeMeter: function(time){
		var parsed_date = ('string' == typeof time) ? Date.parse(time) : time;
		var current_date = new Date();
		var past_seconds = parseInt((current_date.getTime() - parsed_date) / 1000);
		if (past_seconds < 1){
			return '少于1秒前';
		} else if (past_seconds < 60) {
			return past_seconds + '秒前';
		} else if (past_seconds < 60 * 60) {
			return (parseInt(past_seconds / 60)).toString() + '分钟前';
		} else if (past_seconds < 60 * 60 * 24) {
			return '约' + (parseInt(past_seconds / 3600)).toString() + '小时前';
		} else {
			return this.fullDate(time);
		}
	},

	/**
	 * 获取 2009-01-01 12:12 的时间格式
	 */
	fullDate: function(time){
		var date = new Date(time);
		return date.getFullYear() + '-' + (date.getMonth() >= 9 ? '' : '0') + (date.getMonth() + 1) + '-' + (date.getDate() > 9 ? '' : '0') + date.getDate() + ' ' + (date.getHours() > 9 ? '' : '0') + date.getHours() + ':' + (date.getMinutes() > 9 ? '' : '0') + date.getMinutes();
	},

	/**
	 * 设置 window.htmlLoader.navigateInSystemBrowser = true; 也可使用系统浏览器打开外链页面，但是 url 中有中文的话，AIR 会转义两次
	 * @param {string} url 需要使用浏览器打开的 url
	 * @param {string} target 打开链接的方式
	 */
	openURLInbrowser: function(url, target){
		target = target || '_blank';
		air.navigateToURL(new air.URLRequest(url), target);
	},

	/**
	 * 类似 linux 下的 fortune，每次随即选择名句，供登录页使用
	 */
	fortune: function(){
		var re = function(str){
			return str.replace(/饭/g, "<strong>饭</strong>");
		};
		$D.get('login-slogan').innerHTML = re(this._fortuneData[Math.floor(Math.random()*this._fortuneData.length)]);
	},

	/**
	 * 替换文本中的 URL
	 */
	replaceURL: function(str){
		var _this = this;
		return str.replace(this._regURL, function(url){
			if (!_this._regHttp.test(url)){
				var href = 'http://' + url;
			} else {
				var href = url;
			}
			return '<a href="'+href+'" class="outlink">'+url+'</a>';
		});
	}
}
