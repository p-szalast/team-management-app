sap.ui.define([
	"./BaseController",
], function (BaseController) {
	"use strict";

	return BaseController.extend("project.fin.controller.App", {
		onInit: function () {
			BaseController.prototype.onInit.call(this);

			this.getConfigModel().setProperty("/loggedUser", this.getLoggedUser());

			this.getODataModel().attachRequestSent(() => this.byId("mainShell").setBusy(true));
			this.getODataModel().attachRequestFailed(() => this.byId("mainShell").setBusy(false));
			this.getODataModel().attachRequestCompleted(() => this.byId("mainShell").setBusy(false));

			console.log("%cEaster Egg 🐧🥚", "font-size: 0.5em; color: green");
		}
	});
});