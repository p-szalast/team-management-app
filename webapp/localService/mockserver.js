sap.ui.define([
	"sap/ui/core/util/MockServer",
	"sap/base/util/UriParameters"
], function (MockServer, UriParameters) {
	"use strict";

	return {
		init: function () {
			var oMockServer = new MockServer({
				rootUri: "/"
			});

			// 			MockServer.config({
			// 				autoRespondAfter: 5000
			// 			});

			oMockServer.simulate("../localService/metadata.xml", {
				sMockdataBaseUrl: "../localService/mockdata",
				bGenerateMissingMockData: true
			});

			oMockServer.start();
		}
	};

});