/**
 * @namespace ifan
 * ifan 更新器
 */
ifan.updater = {
	/**
	 * 更新器初始化
	 */
	init: function(){
		this.updater = new air.ApplicationUpdaterUI();
		this.updater.configurationFile = new air.File("app:/updateConfig.xml");
		this.updater.isCheckForUpdateVisible = false;
		this.updater.initialize();
	},

	/**
	 * 获取 ifan 的当前版本
	 */
	getVersion: function(){
		return this.updater.currentVersion;
	},

	/**
	 * 开始检查更新
	 * @param {bool} isCheckForUpdateVisible 是否显示开始检查的界面
	 */
	check: function(isCheckForUpdateVisible){
		if (isCheckForUpdateVisible){
			this.updater.isCheckForUpdateVisible = true;
		} else {
			this.updater.isCheckForUpdateVisible = false;
		}
		this.updater.checkNow();
		if (ifan.app._update_timer) clearTimeout(ifan.app._update_timer);
	}
}
