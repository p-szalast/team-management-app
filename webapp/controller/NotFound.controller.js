sap.ui.define(["./BaseController", "sap/m/MessageBox"], function (BaseController, MessageBox) {
	"use strict";

	return BaseController.extend("project.fin.controller.NotFound", {
		onInit: function () {
			BaseController.prototype.onInit.call(this);

			this.getRouter().attachBypassed(this._redirect, this);
		},
		_redirect: function () {
			this.getRouter().navTo("main");
			MessageBox.warning(this.getText("invalidHashMsg"), {
				closeOnNavigation: false,
			});
		}
	});
});