/**
 * @namespace ifan.prefs
 */
ifan.prefs = {
	/**
	 * 载入 preferecens 数据
	 */
	load: function(){
		var dir = air.File.applicationStorageDirectory;
		var prefsFile = dir.resolvePath(PREFS_FILE);
		
		var fs = new air.FileStream();
		if (prefsFile.exists) {
			fs.open(prefsFile, air.FileMode.READ);
			var prefsJSON = fs.readUTFBytes(prefsFile.size);
			ifan.prefsdata = JSON.parse(prefsJSON) || {};
			for (var key in ifan.prefsdata_default){
			if (typeof ifan.prefsdata[key] == 'undefined')
				ifan.prefsdata[key] = ifan.prefsdata_default[key];
			}
			var interval = ifan.prefs.get('update_interval');
			if (interval != 0 && interval < 60000){ // 手工改成 1 分钟是不允许的!
				ifan.prefs.set('update_interval', 120000);
			}
		} else {
			fs.open(prefsFile, air.FileMode.WRITE);
			fs.writeUTFBytes(JSON.stringify(ifan.prefsdata_default));
			ifan.prefsdata = ifan.prefsdata_default;
		}
		fs.close();
		for (var key in ifan.prefsdata_enc){
			ifan.prefs.decrypt(key);
		}
	},

	/**
	 * 保存 preference 数据
	 */
	save: function(){
		var dir = air.File.applicationStorageDirectory,
			fs = new air.FileStream(),
			prefsFile =  dir.resolvePath(PREFS_FILE);
		fs.open(prefsFile, air.FileMode.WRITE);
		fs.writeUTFBytes(JSON.stringify(ifan.prefsdata));
		fs.close();
	},

	/**
	 * 使用 air.EncryptedLocalStore 封装用户名和密码
	 * @param {string} key 
	 * @paran {string} value
	 */
	encrypt: function(key, val){
		var bytes = new air.ByteArray(),
			v = (typeof val != 'undefined') ? val : ifan.prefs.getEnc(key);
		bytes.writeUTFBytes(v);
		try {					// incase of linux not install keyring or kwallet
			air.EncryptedLocalStore.setItem(key, bytes);
		} catch(ex){}
	},

	/**
	 * 获取 air.EncryptedLocalStore 里的数据
	 * @param {string} key 数据的 key
	 */
	decrypt: function(key){
		var val = '';
		try {
			var storedValue = air.EncryptedLocalStore.getItem(key);
		} catch(ex){
			storedValue = '';
			$D.get('passrem-label').style.display = 'none';
			$D.get('option-passrem-p').style.display = 'none';
		}
		if (storedValue){
			val = storedValue.readUTFBytes(storedValue.length);
		}
		ifan.prefs.setEnc(key, val);
	},

	/**
	 * 获取配置项
	 * @param {string} key 数据的 key
	 */
	get: function(key){
		return ifan.prefsdata[key];
	},

	/**
	 * 设置配置项
	 * @param {string} key 数据的 key
	 * @param {string} val 数据的 value
	 */
	set: function(key, val){
		ifan.prefsdata[key] = val;
	},

	/**
	 * 获取加密数据
	 * @param {string} key 数据的 key
	 */
	getEnc: function(key){
		return ifan.prefsdata_enc[key];
	},

	/**
	 * 设置加密数据
	 * @param {string} key 数据的 key
	 * @param {string} val 数据的 value
	 */
	setEnc: function(key, val){
		ifan.prefsdata_enc[key] = val;
	}
}

/**
 * @namespace ifan
 * 默认设置
 */
ifan.prefsdata_default = {
	'host': 'http://jiwai.de',
	'api_host': 'http://api.jiwai.de',
	'passrem': false,
	'accept_notificaiton': true,
	'start_at_login': true,
	'window_position':[120, 60],
	'window_size':[420, 600],
	'window_transparent_on_deactive': true,
	'postarea_height':72,
	'update_interval': 120000,
	'notification_hide_time': 10000,
	'check_update_at_appstart': true
}

/**
 * @namespace ifan
 * 默认用户名和密码
 */
ifan.prefsdata_enc = {
	'username': '',
	'password': ''
}
